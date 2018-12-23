// You can return Promise from both `up` and `down` methods instead of using `next` callback.
// Public methods of MigrationDSL return Promise, so you can use them like in the example below:
exports.up = function() { // do not declare `next` argument here (and do not pass it into further calls)
  return this.addPrimaryKey('table_primary_keys', 'price'); // do not forget to `return` the Promise
};

exports.down = function() {
  return this.dropPrimaryKey('table_primary_keys', 'price');
};
