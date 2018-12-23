var should     = require('should');
var sinon      = require('sinon');
var async      = require('async');
var _          = require('lodash');
var fs         = require('fs');
var path       = require('path');
var helpers    = require('../helpers');
var Migrator       = require('./../../');
var Promise    = require('bluebird');

describe('Migrator', function() {
  var task;
  var conn;
  var cwd;

  var SELECT_MIGRATIONS = 'SELECT * FROM orm_migrations';
  var hasMigrations = function (count, cb) {
    conn.execQuery(SELECT_MIGRATIONS, function (err, migrations) {
      should.not.exist(err);
      migrations.should.have.length(count);
      cb();
    });
  };
  var hasMigrationsAsync = Promise.promisify(hasMigrations);

  var SELECT_COLUMN = 'SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = ? AND column_name = ?';
  var hasColumn = function (table, column, cb) {
    conn.execQuery(SELECT_COLUMN, [table, column], function (err, columns) {
      should.not.exist(err);
      columns.should.have.length(1);
      cb();
    });
  };
  var hasColumnAsync = Promise.promisify(hasColumn);

  var SELECT_TABLE = 'SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE table_name = ?';
  var hasTable = function (table, cb) {
    conn.execQuery(SELECT_TABLE, [table], function (err, tables) {
      should.not.exist(err);
      tables.should.have.length(1);
      cb();
    });
  };

  var hasNoTable = function (table, cb) {
    conn.execQuery(SELECT_TABLE, [table], function (err, tables) {
      should.not.exist(err);
      tables.should.have.length(0);
      cb();
    });
  };
  var hasNoTableAsync = Promise.promisify(hasNoTable);

  before(function (done) {
    helpers.connect(function (err, connection) {
      if (err) return done(err);
      conn = connection;
      cwd = this.process.cwd();
      done();
    });
  });

  after(function (done) {
    helpers.cleanupDir('migrations', function () {
      conn.close(done);
    });
  });

  describe('Support of migrations written with Promises', function() {
    describe('optimistic case', function () {
      var tablePromisedMigration = "exports.up = function () {         \n\
          return this.createTable('table_promised', {                  \n\
            id     : { type : \"integer\", key: true },                \n\
            name   : { type : \"text\", required: true }               \n\
          });                                                          \n\
        };                                                             \n\
                                                                       \n\
        exports.down = function () {                                   \n\
          return this.dropTable('table_promised');                     \n\
        };";


      //ensure the migration folder is cleared before each test
      beforeEach(function (done) {
        task = new Migrator(conn, {dir: 'migrations'});
        helpers.cleanupDbAndDir(conn, task.dir, ['table_promised'], function () {
          task.setup(function (err) {
            should.not.exist(err);
            helpers.writeMigration(task, '001-create-table-promised.js', tablePromisedMigration);
            done();
          });
        });
      });

      it('runs down migrations using name (including)', function () {
        return task.up()
          .then(function () {
            return hasMigrationsAsync(1);
          })
          .then(function () {
            return task.down('001-create-table1-promised.js');
          })
          .then(function () {
            return Promise.all([
              hasMigrationsAsync(0),
              hasNoTableAsync('table_promised')
            ]);
          });
      });
    });

    describe('error case', function () {

      describe('when migration.up returns rejected promise', function () {

        var badUpMigration = "exports.up = function () {               \n\
          return Promise.reject(new Error('problem_up'));              \n\
        };                                                             \n\
                                                                       \n\
        exports.down = function () {                                   \n\
          return this.dropTable('table_promised');                     \n\
        };";


        //ensure the migration folder is cleared before each test
        beforeEach(function (done) {
          task = new Migrator(conn, {dir: 'migrations'});
          helpers.cleanupDbAndDir(conn, task.dir, ['table_promised'], function () {
            task.setup(function (err) {
              should.not.exist(err);
              helpers.writeMigration(task, '001-create-table-promised.js', badUpMigration);
              done();
            });
          });
        });

        it('runs down migrations using name (including)', function () {
          return task.up()
            .catch(function (err) {
              err.should.be.instanceOf(Error);
              err.message.should.equal('problem_up');
            });
        });
      });

      describe('when migration.down returns rejected promise', function () {

        var badDownMigration = "exports.up = function () {             \n\
          return this.createTable('table_promised', {                  \n\
            id     : { type : \"integer\", key: true },                \n\
            name   : { type : \"text\", required: true }               \n\
          });                                                          \n\
        };                                                             \n\
                                                                       \n\
        exports.down = function () {                                   \n\
          return Promise.reject(new Error('problem_down'));            \n\
        };";


        //ensure the migration folder is cleared before each test
        beforeEach(function (done) {
          task = new Migrator(conn, {dir: 'migrations'});
          helpers.cleanupDbAndDir(conn, task.dir, ['table_promised'], function () {
            task.setup(function (err) {
              should.not.exist(err);
              helpers.writeMigration(task, '001-create-table-promised.js', badDownMigration);
              done();
            });
          });
        });

        it('runs down migrations using name (including)', function () {
          return task.up()
            .then(function () {
              return task.down();
            })
            .catch(function (err) {
              err.should.be.instanceOf(Error);
              err.message.should.equal('problem_down');
            });
        });
      })

    });
  });

  describe('Support of migrations written with callbacks', function() {

    //ensure the migration folder is cleared before each test
    beforeEach(function (done) {
      task = new Migrator(conn, {dir: 'migrations'});
      helpers.cleanupDbAndDir(conn, task.dir, ['table1', 'table2'], function () {
        task.setup(function (err) {
          should.not.exist(err);
          helpers.writeMigration(task, '001-create-table1.js', table1Migration);
          helpers.writeMigration(task, '002-add-two-columns.js', column2Migration);
          done();
        });
      });
    });

    describe('#up', function () {
      it('runs a no arg up migrations successfully', function (done) {
        task.up(function (err, result) {
          hasMigrations(2, done);
        })
      });

      it('runs a specific up migration successfully', function (done) {
        task.up('001-create-table1.js', function (err, result) {
          hasMigrations(1, done);
        })
      });

      it('runs two migrations successfully', function (done) {
        async.series([
          task.up.bind(task),
          _.partial(hasColumn, 'table1', 'wobble'),
          _.partial(hasColumn, 'table1', 'wibble')
        ], done);
      });

      it('doesnt re perform existing migration', function (done) {
        async.series([
          task.up.bind(task, '001-create-table1.js'),
          _.partial(hasMigrations, 1),
          task.up.bind(task),
          _.partial(hasMigrations, 2)
        ], done);
      });

      describe('Migrator.prototype.up Promise support', function () {
        describe('optimistic case', function () {
          it('runs two migrations successfully', function () {
            return task.up().then(function () {
              return Promise.all([
                hasColumnAsync('table1', 'wobble'),
                hasColumnAsync('table1', 'wibble')
              ]);
            });
          });
        });

        describe('error case', function() {
          beforeEach(function() {
            sinon.stub(task, 'performMigration').yields(new Error('problem'));
          });

          afterEach(function() {
            sinon.restore();
          });

          it('returns rejected Promise', function () {
            return task.up()
              .catch(function (err) {
                err.should.be.instanceOf(Error);
                err.message.should.equal('problem');
              });
          });
        });
      });
    });

    describe('#down', function () {
      it('runs a no arg down migrations successfully (one step)', function (done) {
        async.series([
          task.up.bind(task),
          _.partial(hasMigrations, 2),
          task.down.bind(task),
          _.partial(hasMigrations, 1)
        ], done);
      });

      it('runs down migrations using name (including)', function (done) {
        async.series([
          task.up.bind(task),
          _.partial(hasMigrations, 2),
          task.down.bind(task, '001-create-table1.js'),
          _.partial(hasMigrations, 0),
          _.partial(hasNoTable, 'table1')
        ], done);
      });

      describe('Migrator.prototype.down Promise support', function () {
        describe('optimistic case', function() {

          it('runs two migrations successfully', function () {
            return task.up()
              .then(function () {
                return hasMigrationsAsync(2);
              })
              .then(function () {
                return task.down('001-create-table1.js');
              })
              .then(function () {
                return Promise.all([
                  hasMigrationsAsync(0),
                  hasNoTableAsync('table1')
                ]);
              });
          });
        });

        describe('error case', function() {
          beforeEach(function() {
            sinon.stub(task, 'performMigration')
              .callThrough()
              .withArgs('down').yields(new Error('problem'));
          });

          afterEach(function() {
            sinon.restore();
          });

          it('returns rejected Promise', function () {
            return task.up()
              .then(function () {
                return hasMigrationsAsync(2);
              })
              .then(function () {
                return task.down('001-create-table1.js');
              })
              .catch(function (err) {
                err.should.be.instanceOf(Error);
                err.message.should.equal('problem');
              });
          });
        });
      });
    });

    describe('#up and #down combinations', function () {
      it('works with [up(no args), down(no args - one step), up(no args)]', function (done) {
        async.series([
          task.up.bind(task),
          _.partial(hasMigrations, 2),
          task.down.bind(task),
          _.partial(hasMigrations, 1),
          task.up.bind(task),
          _.partial(hasMigrations, 2)
        ], done);
      });

      it('works with [up(with args - one step), down(no args - one step), up(no args)]', function (done) {
        async.series([
          task.up.bind(task, '001-create-table1.js'),
          _.partial(hasMigrations, 1),
          task.down.bind(task),
          _.partial(hasMigrations, 0),
          task.up.bind(task),
          _.partial(hasMigrations, 2)
        ], done);
      });

      it('works with [up(with args - one step), up(with args - one step), down(with args - two steps)]', function (done) {
        async.series([
          task.up.bind(task, '001-create-table1.js'),
          _.partial(hasMigrations, 1),
          task.up.bind(task, '002-create-table1.js'),
          _.partial(hasMigrations, 2),
          task.down.bind(task, '001-create-table1.js'),
          _.partial(hasMigrations, 0)
        ], done);
      });
    });

    describe('#generate', function () {
      it('generates a migration', function (done) {
        task.generate('test1', function (err, filename) {
          var filePath = path.join(cwd, task.dir, filename + '.js');
          fs.statSync(filePath).isFile().should.be.true();
          done();
        });
      });

      it('generates a coffee migration', function (done) {
        task = new Migrator(conn, {coffee: true});
        task.generate('test1', function (err, filename) {
          var filePath = path.join(cwd, task.dir, filename + '.coffee');
          fs.statSync(filePath).isFile().should.be.true();
          done();
        });
      });

      describe('Migrator.prototype.generate Promise support', function () {
        describe('optimistic case', function() {
          it('generates a migration', function () {
            return task.generate('test1')
              .then(function (filename) {
                var filePath = path.join(cwd, task.dir, filename + '.js');
                fs.statSync(filePath).isFile().should.be.true();
              })
          });
        });

        // this method (Migrator.prototype.generate) never returns rejected promise
        // due to implementation of the original method
      });
    });

    describe('#setup', function () {
      beforeEach(function () {
        sinon.spy(task, 'setup');
      });

      afterEach(function () {
        task.setup.restore();
      });

      it('creates the migration folder', function (done) {
        var dirPath = path.join(cwd, task.dir);
        fs.statSync(dirPath).isDirectory().should.be.true();
        done();
      });

      it('create the migrations table', function (done) {
        hasTable('orm_migrations', done);
      });

      it('gets called when calling #up', function (done) {
        task.up(function () {
          task.setup.called.should.be.true();
          done();
        });
      });
    });


    var table1Migration = "exports.up = function (next) {          \n\
    this.createTable('table1', {                                   \n\
      id     : { type : \"integer\", key: true },                  \n\
      name   : { type : \"text\", required: true }                 \n\
    }, next);                                                      \n\
    };                                                             \n\
                                                                   \n\
    exports.down = function (next){                                \n\
      this.dropTable('table1', next);                              \n\
    };";

    var column2Migration = "exports.up = function (next) {         \n\
      var that = this;                                             \n\
      this.addColumn('table1', {                                   \n\
        wobble   : { type : \"text\", required: true }             \n\
      }, function(err) {                                           \n\
        if(err) { return next(err); }                              \n\
        that.addColumn('table1', {                                 \n\
          wibble   : { type : \"text\", required: true }           \n\
        }, next);                                                  \n\
      });                                                          \n\
    };                                                             \n\
    exports.down = function(next){                                 \n\
      var that = this;                                             \n\
      this.dropColumn('table1', 'wibble', function(err){           \n\
        if(err) { return next(err); }                              \n\
        that.dropColumn('table1', 'wobble', next);                 \n\
      });                                                          \n\
    };";
  });

});
