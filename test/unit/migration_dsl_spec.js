"use strict";
var _             = require('lodash');
var sinon         = require('sinon');
var shared        = require('shared-examples-for');

var MigrationDSL  = require('../../lib/migration-dsl');

var noop = function(){};

var fake = {
  object: function () { return {} },

  dialect: function () {
    return {
      addCollectionColumn: noop,
      createCollection: noop,
      renameCollectionColumn: noop,
      addIndex: noop,
      removeIndex: noop,
      dropCollectionColumn: noop,
      dropCollection: noop,
      addPrimaryKey: noop,
      dropPrimaryKey: noop,
      addForeignKey: noop,
      dropForeignKey: noop,
      hasCollection: noop,
      getCollectionProperties: noop
    };
  },

  driver: function (dialect) {
    return {
      dialect: dialect,
      query: {
        escapeId: 'the-escape-id'
      },
      execQuery: noop
    }
  },

  dsl: function (driver) {
    return new MigrationDSL(driver);
  }
};

shared.examplesFor('supporting callback interface', function(opts) {
  describe('Callback interface', function() {
    // 'Setup context'
    beforeEach(function () {
      if (!opts.run) {
        throw '`run` option is required (Function)!';
      }
      if (!opts.internalObject) {
        throw '`internalObject`option is required!';
      }
      if (!opts.internalMethodName) {
        throw '`internalMethodName`option is required!';
      }
    });

    afterEach(function () {
      sinon.verifyAndRestore();
    });

    describe('optimistic case', function () {
      // 'stub internal call'
      beforeEach(function () {
        sinon.stub(opts.internalObject, opts.internalMethodName).yields(null, 123);
      });

      it('calls the passed callback', function (done) {
        var cb = sinon.mock();
        cb.callsFake(done);

        cb.once().withArgs(null, 123);

        opts.run(cb);
      });
    });

    describe('error case', function () {
      beforeEach(function () {
        sinon.stub(opts.internalObject, opts.internalMethodName).yields(new Error('problem'));
      });

      it('transfer error to the passed callback', function (done) {
        var cb = sinon.mock();
        cb.callsFake(function () {
          done()
        });

        cb.once().withArgs(sinon.match.instanceOf(Error).and(sinon.match.has('message', 'problem')));

        opts.run(cb);
      });
    });
  })
});

shared.examplesFor('supporting Promise interface', function(opts) {
  describe('Promise interface', function () {
    // 'Setup context'
    beforeEach(function () {
      if (!opts.run) {
        throw '`run` option is required (Function)!';
      }
      if (!opts.internalObject) {
        throw '`internalObject`option is required!';
      }
      if (!opts.internalMethodName) {
        throw '`internalMethodName`option is required!';
      }
    });

    afterEach(function () {
      sinon.verifyAndRestore();
    });

    describe('optimistic case', function () {
      beforeEach(function () {
        sinon.stub(opts.internalObject, opts.internalMethodName).yields(null, 123);
      });

      it('returns Promise unless callback is specified', function () {
        return opts.run()
          .then(function (val) {
            val.should.be.equal(123);
          });
      });
    });

    describe('error case', function () {
      beforeEach(function () {
        sinon.stub(opts.internalObject, opts.internalMethodName).yields(new Error('problem'));
      });

      it('returns rejected Promise unless callback is specified', function () {
        return opts.run()
          .catch(function (err) {
            err.should.be.instanceOf(Error);
            err.message.should.equal('problem');
          });
      });
    });
  });
});

describe('MigrationDSL', function() {
  var dialect = fake.dialect();
  var driver = fake.driver(dialect);
  var dsl;

  beforeEach(function () {
    this.currentTestOptions = {};
  });

  beforeEach(function () {
    sinon.stub(require("@fxjs/sql-ddl-sync"), 'dialect').callsFake(function () { return dialect; });
    dsl = fake.dsl(driver);
  });

  afterEach(function () {
    sinon.verifyAndRestore();
  });

  describe('MigrationDSL.prototype.createTable', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'createCollection'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          dsl.createTable('collection_name', {}, cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.createTable('collection_name', {});
        }
      })
    );
  });

  describe('MigrationDSL.prototype.addColumn', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'addCollectionColumn'
    };

    beforeEach(function () {
      sinon.stub(dsl, 'createColumn').callsFake(function ()  { return fake.object() });
    });

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        internalObject: dialect,
        internalMethodName: 'addCollectionColumn',
        run: function(cb) {
          dsl.addColumn('fake_column', {columnName: {}}, cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.addColumn('fake_column', {columnName: {}});
        }
      })
    );
  });

  describe('MigrationDSL.prototype.renameColumn', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'renameCollectionColumn'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          return dsl.renameColumn('collection_name', 'old_name', 'new_name', cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.renameColumn('fake_column', {columnName: {}});
        }
      })
    );
  });

  describe('MigrationDSL.prototype.addIndex', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'addIndex'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          dsl.addIndex('index_name', {}, cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.addIndex('index_name', {});
        }
      })
    );
  });

  describe('MigrationDSL.prototype.dropIndex', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'removeIndex'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          dsl.dropIndex('index_name', {}, cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.dropIndex('index_name', {});
        }
      })
    );
  });

  describe('MigrationDSL.prototype.dropColumn', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'dropCollectionColumn'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          dsl.dropColumn('collection_name', 'column_name', cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.dropColumn('collection_name', 'column_name');
        }
      })
    );
  });

  describe('MigrationDSL.prototype.dropTable', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'dropCollection'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          dsl.dropTable('collection_name', cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.dropTable('collection_name');
        }
      })
    );
  });

  describe('MigrationDSL.prototype.addPrimaryKey', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'addPrimaryKey'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          dsl.addPrimaryKey('collection_name', 'column_name', cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
      run: function() {
          return dsl.addPrimaryKey('collection_name', 'column_name');
        }
      })
    );
  });

  describe('MigrationDSL.prototype.addForeignKey', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'addForeignKey'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          return dsl.addForeignKey('collection_name', {}, cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.addForeignKey('collection_name', {});
        }
      })
    );
  });

  describe('MigrationDSL.prototype.dropPrimaryKey', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'dropPrimaryKey'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          dsl.dropPrimaryKey('collection_name', 'column_name', cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.dropPrimaryKey('collection_name', 'column_name');
        }
      })
    );
  });

  describe('MigrationDSL.prototype.dropForeignKey', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'dropForeignKey'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          dsl.dropForeignKey('collection_name', 'column_name', cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.dropForeignKey('collection_name', 'column_name');
        }
      })
    );
  });

  describe('MigrationDSL.prototype.hasTable', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'hasCollection'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          dsl.hasTable('collection_name', cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.hasTable('collection_name');
        }
      })
    );
  });

  describe('MigrationDSL.prototype.getColumns', function() {
    var contextOpts = {
      internalObject: dialect,
      internalMethodName: 'getCollectionProperties'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          dsl.getColumns('collection_name', cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.getColumns('collection_name');
        }
      })
    );
  });

  describe('MigrationDSL.prototype.execQuery', function() {
    var contextOpts = {
      internalObject: driver,
      internalMethodName: 'execQuery'
    };

    shared.shouldBehaveLike('supporting callback interface',
      _.assign({}, contextOpts, {
        run: function(cb) {
          dsl.execQuery('collection_name', {}, cb);
        }
      })
    );

    shared.shouldBehaveLike('supporting Promise interface',
      _.assign({}, contextOpts, {
        run: function() {
          return dsl.execQuery('collection_name', {});
        }
      })
    );
  });

});
