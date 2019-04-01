/// <reference lib="es6" />

import fs                 = require('fs');
import path               = require('path');
import util               = require('util');

import pathParse          = require('path-parse');
import async              = require('async');
import mkdirp             = require('@fibjs/mkdirp');

import Migration          = require('./migration');
import MigrationDsl       = require('./migration-dsl');
import { addPromiseInterface, prependIfNotAbsPath } from './utils';

/**
 * Log a keyed message.
 */
function log(key, msg) {
  console.log('  \033[90m%s :\033[0m \033[36m%s\033[0m', key, msg);
}

/**
 * Slugify the given `str`.
 */
function slugify(str) {
  return str.replace(/\s+/g, '-');
}

/**
 * Pad the given number.
 *
 * @param {Number} n
 * @return {String}
 */
function pad(n: number) {
  return Array(4 - n.toString().length).join('0') + n;
}

var jsTemplate = [
  ''
  , 'exports.up = function(next){'
  , '  next();'
  , '};'
  , ''
  , 'exports.down = function(next){'
  , '  next();'
  , '};'
  , ''
].join('\n');

var coffeeTemplate = [
  ''
  , 'exports.up = (next) ->'
  , '  next()'
  , ''
  , 'exports.down = (next) ->'
  , '  next()'
  , ''
].join('\n');

/**
 * Create a migration with the given `name`.
 *
 * @param {String} name
 */

function generate(name: string, extension: string) {
  var template = ((extension === "js") ? jsTemplate : coffeeTemplate) as string | Class_Buffer;
  var filePath = name + '.' + extension;
  log('create', prependIfNotAbsPath(filePath, process.cwd()));
  fs.writeFile(filePath, template as Class_Buffer);
}

class Migrator implements FxOrmPlugin__Migrator.Migrator {
  driver: FxOrmSqlDDLSync__Driver.Driver<FxSqlQuery.Class_Query>
  dir: string
  coffee: boolean
  logger: Function
  
  dsl?: MigrationDsl
  migration?: Migration

  constructor (
    driver: FxOrmSqlDDLSync__Driver.Driver<FxSqlQuery.Class_Query>,
    opts?: FxOrmPlugin__Migrator.MigratorConstructorOptions
  ) {
    opts                  = (opts || {});
    this.driver           = driver;
    this.dir              = (opts.dir || 'migrations');
    this.coffee           = (opts.coffee || false);
    this.logger           = (opts.logger || log);

    if (this.driver) {
      this.dsl              = new MigrationDsl(this.driver);
      this.migration        = new Migration(this.dsl, this.logger);
    }
  }

  /**
   * Create the migration directory and storage table.
   */

  setup (done) {
    this.mkdir(this.ensureMigrationsTable.bind(this, done));
  };

  /**
   * Create the migration directory
   */

  mkdir (done) {
    let err = null
    try {
      mkdirp(this.dir, {mode: 0o774});
    } catch (e) {
      err = e
    } finally {
      done(err);
    }
  };

  /**
   * Load migrations modules from the file system.
   */

  loadModules (): FxOrmPlugin__Migrator.MigratorModule[] {
    var self = this;
    // return fs.readdirSync(this.dir).filter(function(file) {
    return fs.readdir(this.dir).filter(function(file) {
      if (self.coffee) {
        return file.match(/^\d+.*\.coffee$/);
      }
      else {
        return file.match(/^\d+.*\.js$/);
      }
    }).sort().map(function(file) {
      const basedir = prependIfNotAbsPath(self.dir, process.cwd());
      var mod_path = path.join(basedir, file);
      var mod = require(mod_path);
      return { file: file, up: mod.up, down: mod.down };
    });
  };

  /**
   * Perform a migration in the given `direction`.
   *
   * @param {Number} direction
   */

  performMigration (
    direction: FxOrmPlugin__Migration.MigrationTableRow['direction'],
    migrationName: string,
    cb: FxOrmSqlDDLSync.ExecutionCallback<any>
  ) {
    var self = this;
    var fileName: string;

    if(typeof migrationName === 'function') {
      cb = migrationName;
      migrationName = '';
    }

    this.migration.all(function(err, appliedMigrations) {
      if(err) return cb(err);

      var migrationModules = self.loadModules();

      if(direction === 'down') migrationModules.reverse();

      // determine cut off point for a given migrationName
      var cutOff = migrationModules.findIndex(x => x.file === migrationName);
      if(cutOff > -1) {
        migrationModules = migrationModules.slice(0, cutOff + 1);
      }

      // is a migration module applied ?
      var isApplied = function(isMatch: boolean) {
        return (mod: FxOrmPlugin__Migrator.MigratorModule) => {
          fileName = pathParse(mod.file).name;
          const res = appliedMigrations.some(function (appliedMigration) {
            return !!appliedMigration.match(fileName);
          });
          return isMatch ? res : !res;
        }
      }
      if(direction === 'up') { // up -> reject the applied migrations
        migrationModules = migrationModules.filter(isApplied(false));
      } else {                 // down -> we only do the applied one
        migrationModules = migrationModules.filter(isApplied(true));
        // down migration without parameter -> rollback only the first one
        if(util.isEmpty(migrationName)) migrationModules = [ util.first(migrationModules) ];
      }

      var migrationCalls = migrationModules.map(function(mod) {
        return function(done: FxOrmSqlDDLSync.ExecutionCallback<string>) {
          self.logger(direction, mod.file);
          // call the up/down function, using dsl as 'this'

          var cb = function (err?: Error) {
            if (err) return done(err);
            if (direction === 'up') {
              self.migration.save(mod.file, done);
            } else {
              fileName = pathParse(mod.file).name;
              self.migration.delete(fileName, done);
            }
          };

          var migrationMethod = mod[direction];
          var migrationMethodExpectsCallback = migrationMethod.length > 0;
          if (migrationMethodExpectsCallback) {
            migrationMethod.call(self.dsl, cb);
          } else {
            migrationMethod.call(self.dsl)
              .then(function() { return cb(); })
              .catch(cb);
          }
        };
      });

      async.series(migrationCalls, function(err) {
        if(err) return cb(err);
        self.logger('migration', 'complete');
        cb();
      });
    })
  };

  /**
   * up [name]
   * @promise
   */
  up <T = any>(migrationName: string, cb?: FxOrmSqlDDLSync.ExecutionCallback<any>): void | PromiseLike<T> | any {
    var self = this;
    this.setup(function(err: Error) {
      if (err) return cb(err);
      self.performMigration('up', migrationName, cb);
    });
  };


  /**
   * down [name]
   * @promise
   */

  down <T = any>(migrationName: string, cb?: FxOrmSqlDDLSync.ExecutionCallback<any>): void | PromiseLike<T> | any {
    var self = this;
    this.setup(function(err: Error) {
      if(err) return cb(err);
      self.performMigration('down', migrationName, cb);
    });
  }

  /**
   * create [title]
   * @promise
   */

  generate <T = any>(title: string, cb?: FxOrmSqlDDLSync.ExecutionCallback<any>): void | PromiseLike<T> | any {
    var self = this;
    this.mkdir(function(){
      // var migrations = fs.readdirSync(self.dir).filter(function(file) {
      var migrations = fs.readdir(self.dir).filter(function(file) {
        return file.match(/^\d+/);
      }).map(function(file){
          return parseInt(file.match(/^(\d+)/)[1], 10);
        }).sort(function(a, b){
          return a - b;
        });

      var curr = pad((migrations.pop() || 0) + 1);
      title = title ? curr + '-' + title : curr;
      var extension = (self.coffee ? 'coffee' : 'js');
      generate(self.dir + '/' + title, extension);
      cb(null, title);
    })
  };

  ensureMigrationsTable <T = any>(cb?: FxOrmSqlDDLSync.ExecutionCallback<any>): void | PromiseLike<T> | any {
    this.migration.ensureMigrationsTable(cb);
  };
}

;[
  "up",
  "down",
  "generate"
].forEach(methodName => {
  Migrator.prototype[methodName] = addPromiseInterface(Migrator.prototype[methodName])
});

export = Migrator;
