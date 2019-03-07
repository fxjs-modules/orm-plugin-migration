const _     = require("lodash");
const async = require('async');
import MigrationDsl from './migration-dsl';

function noOp () {};
class Migration {
  log: Function
  dsl: MigrationDsl

  constructor(dsl: MigrationDsl, log: Function) {
    this.dsl = dsl;
    this.log = log || noOp;
  }

  last <T = any>(cb: FxOrmSqlDDLSync.ExecutionCallback<T>) {
    this.dsl.execQuery('SELECT migration FROM orm_migrations ORDER BY migration DESC LIMIT 1;', [], function(err, results) {
      if(err) return cb(err);
      if(results.length === 0) {
        cb();
      } else {
        cb(null, results[0].migration);
      }
    });
  }

  all <T = any>(cb: FxOrmSqlDDLSync.ExecutionCallback<T>) {
    this.dsl.execQuery('SELECT migration FROM orm_migrations ORDER BY migration DESC;', [], function(err, results) {
      if(err) return cb(err);
      cb(null, _.map(results, 'migration'));
    });
  }

  save <T = any>(migration: FxOrmSqlDDLSync.TableName, cb: FxOrmSqlDDLSync.ExecutionCallback<T>) {
    this.dsl.execQuery('INSERT INTO orm_migrations(migration) VALUES(?);', [migration], cb);
  }

  delete <T = any>(migration: FxOrmSqlDDLSync.TableName, cb: FxOrmSqlDDLSync.ExecutionCallback<T>) {
    this.dsl.execQuery('DELETE FROM orm_migrations WHERE migration LIKE ?;', [migration + '%'], cb);
  }

  allV1 <T = any>(cb: FxOrmSqlDDLSync.ExecutionCallback<T>) {
    this.dsl.execQuery('SELECT migration, direction, created_at FROM orm_migrations ORDER BY created_at DESC;', [], function(err, results) {
      if(err) return cb(err);
      cb(null, results);
    });
  }

  ensureMigrationsTable <T = any>(cb: FxOrmSqlDDLSync.ExecutionCallback<T>) {
    var dsl = this.dsl;
    var self = this;

    var createTable = function(cb) {
      dsl.createTable('orm_migrations', { migration : { type : "text", required: true } }, cb);
    };
    var createIndex = function(cb) {
      dsl.addIndex('unique_orm_migrations', { table: 'orm_migrations', columns: ['migration'] , unique: true }, cb);
    };
    var updateTable = function(cb) {
      async.series([
        dsl.dropColumn.bind(dsl, 'orm_migrations', 'direction'),
        dsl.dropColumn.bind(dsl, 'orm_migrations', 'created_at')
      ], cb);
    };
    var migrateData = function(cb) {
      // we do the following
      // 1. load all migrations
      // 2. create a list of migrations to delete
      // 3. delete them
      async.waterfall([
        self.allV1.bind(self),
        function(migrations, cb) {
          var downMigrations = _.filter(migrations, {direction: 'down'});
          // for each down migration we can delete one matching up migration
          var toDelete = [];
          _.each(downMigrations, function(down) {
            toDelete.push(down);
            // first matchin up index
            var indexUp = _.findIndex(migrations, { direction: 'up', migration: down.migration });
            toDelete.push(migrations.splice(indexUp, 1));
          });
          cb(null, _.flatten(toDelete));
        },
        function(toDelete, cb) {
          var deleteOne = function(m, cb) {
            var query = 'DELETE FROM orm_migrations WHERE orm_migrations.migration = ? AND orm_migrations.created_at = ?';
            var params = [m.migration, m.created_at];
            dsl.execQuery(query, params, cb);
          }
          async.eachSeries(toDelete, deleteOne, cb);
        }
      ], cb);
    };

    dsl.hasTable('orm_migrations', function(err, hasMigrationsTable) {
      if(err) return cb(err);
      if(hasMigrationsTable) {
        dsl.getColumns('orm_migrations', function(err, columns) {
          if (err) return cb(err);
          if (Object.keys(columns).length > 1) {                        // v1 ( multi columns ) -> migrate to v2
            self.log('init', 'Migrations table is v1, changing to v2');
            async.series([migrateData, updateTable, createIndex], cb);
          } else {                                                      // v2 -> nothing to do
            cb();
          }
        });
      } else {                                                          // no migrations table -> create it
        self.log('init', 'No migrations table, creating one');
        async.series([createTable, createIndex], cb);
      }
    });
  }
}

export = Migration;
