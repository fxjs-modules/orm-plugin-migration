/// <reference lib="es6" />

const _                  = require("lodash");
import fs                 = require('fs');
import path               = require('path');
import pathParse          = require('path-parse');
import async              = require('async');
import mkdirp             = require('@fibjs/mkdirp');

import Migration          = require('./migration');
import MigrationDsl       = require('./migration-dsl');
import { addPromiseInterface } from './utils';

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
  log('create', path.join(this.process.cwd(), filePath));
  fs.writeFile(filePath, template as Class_Buffer);
}

class Migrator {
  driver: FxOrmSqlDDLSync__Driver.Driver
  dir: string
  coffee: boolean
  logger: Function
  dsl: MigrationDsl
  migration: Migration

  constructor (
    driver: FxOrmSqlDDLSync__Driver.Driver,
    opts: FxOrmPlugin__Migrator.MigratorConstructorOptions
  ) {
    opts                  = (opts || {});
    this.driver           = driver;
    this.dir              = (opts.dir || 'migrations');
    this.coffee           = (opts.coffee || false);
    this.logger           = (opts.logger || log);
    this.dsl              = new MigrationDsl(this.driver);
    this.migration        = new Migration(this.dsl, this.logger);
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

  loadModules () {
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
      var mod_path = path.join(process.cwd(), self.dir, file);
      var mod = require(mod_path);
      return { file: file, up: mod.up, down: mod.down };
    });
  };

  /**
   * Perform a migration in the given `direction`.
   *
   * @param {Number} direction
   */

  performMigration (direction, migrationName, cb) {
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
      var cutOff = _.findIndex(migrationModules, { file: migrationName });
      if(cutOff > -1) {
        migrationModules = migrationModules.slice(0, cutOff + 1);
      }

      // is a migration module applied ?
      var isApplied = function(mod) {
        fileName = pathParse(mod.file).name;
        var res = _.some(appliedMigrations, function(appliedMigration) {
          return appliedMigration.match(fileName);
        });
        return res;
      }
      if(direction === 'up') { // up -> reject the applied migrations
        migrationModules = _.reject(migrationModules, isApplied);
      } else {                 // down -> we only do the applied one
        migrationModules = _.filter(migrationModules, isApplied);
        // down migration without parameter -> rollback only the first one
        if(_.isEmpty(migrationName)) migrationModules = [ _.head(migrationModules) ];
      }

      var migrationCalls = _.map(migrationModules, function(mod) {
        return function(done) {
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
  up (migrationName, cb) {
    var self = this;
    this.setup(function(err) {
      if (err) return cb(err);
      self.performMigration('up', migrationName, cb);
    });
  };


  /**
   * down [name]
   * @promise
   */

  down (migrationName, cb) {
    var self = this;
    this.setup(function(err) {
      if(err) return cb(err);
      self.performMigration('down', migrationName, cb);
    });
  }

  /**
   * create [title]
   * @promise
   */

  generate (title, cb) {
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

  ensureMigrationsTable (cb) {
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
