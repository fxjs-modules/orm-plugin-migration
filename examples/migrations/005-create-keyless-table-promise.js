// You can return Promise from both `up` and `down` methods instead of using `next` callback.
// Public methods of MigrationDSL return Promise, so you can use them like in the example below:
exports.up = function() { // do not declare `next` argument here (and do not pass it into further calls)
  return this.createTable('table_primary_keys', { // do not forget to `return` the Promise
    price  : { type : "number" }
  });
};

exports.down = function() {
  return this.dropTable('table_primary_keys');
};


