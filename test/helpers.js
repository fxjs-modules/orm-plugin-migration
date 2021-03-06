var _      = require('lodash');
var fs     = require('fs');
var util   = require('util');
var path   = require('path');
var orm    = require('@fxjs/orm');
var rmdirr = require('@fibjs/rmdirr');
var async  = require('async');

var aliases = {
  postgres: 'postgresql'
};

var travisConfig = {
  // mysql: {
  //   protocol : 'mysql',
  //   username : "root",
  //   password : "",
  //   query    : {},
  //   database : 'test',
  //   host     : '127.0.0.1',
  //   port     : 3306
  // },
  mysql: "mysql://root:@127.0.0.1:3306/orm_migration_test",
  // postgresql : {
  //   protocol : 'postgresql',
  //   user     : "postgres",
  //   password : "",
  //   query    : {},
  //   database : 'orm_migration_test',
  //   host     : '127.0.0.1',
  //   port     : 5432
  // },
  sqlite     : 'sqlite:test.db',
};

module.exports = {
  isTravis: function () {
    return Boolean(process.env.CI);
  },

  config: function () {
    if (this.isTravis()) {
      return travisConfig;
    } else {
      return require('./config');
    }
  },

  protocol: function () {
    var pr = process.env.ORM_PROTOCOL;

    return aliases[pr] || pr
  },

  connect: function (cb) {
    var config = this.config();
    var protocol = this.protocol();

    if (!(protocol in config)) {
      var emsg = "";

      if (!protocol) {
        emsg = "No protocol specified. Specify using: ORM_PROTOCOL=mysql mocha test/integration"
      } else {
        emsg = "Protocol '" + protocol + "' missing in config.js"
      }

      return cb(new Error(emsg));
    }

    // leaving this here for debugging.
    process.env.DEBUG && orm.settings.set("connection.debug", true);

    orm.connect(config[protocol], function (err, connection) {
      if (err) return cb(err);
      cb(null, connection.driver);
    });
  },

  writeMigration: function (task, name, code) {
    var filePath = util.format(
      "%s/%s/%s", path.normalize(path.join(__dirname, '..')), task.dir, name
    );

    // Because we have different migration files with the same path.
    if (require.cache && require.cache.hasOwnProperty(filePath))
      delete require.cache[filePath];

    fs.writeFileSync(filePath, code);
  },

  cleanupDir: function (folder, cb) {
    rmdirr(path.join(process.cwd(), folder));
    cb();
  },

  cleanupDb: function (conn, tables, cb) {
    tables.reverse();
    tables.push("orm_migrations");
    tables.reverse();

    var dropper = function(table, cb) {
      conn.execQuery('DROP TABLE IF EXISTS ??', [table], cb);
    }

    async.eachSeries(tables, dropper, cb);
  },

  cleanupDbAndDir: function (conn, folder, tables, cb) {
    async.series([
      this.cleanupDir.bind(this, folder),
      this.cleanupDb.bind(this, conn, tables)
    ], cb);
  }
};
