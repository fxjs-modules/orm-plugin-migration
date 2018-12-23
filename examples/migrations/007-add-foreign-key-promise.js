// Note - this is an example only. Table2
// You can return Promise from both `up` and `down` methods instead of using `next` callback.
// Public methods of MigrationDSL return Promise, so you can use them like in the example below:
exports.up = function() { // do not declare `next` argument here (and do not pass it into further calls)
  return this.addForeignKey('test_table2', // do not forget to `return` the Promise
    { name:       'table1id',
      references: { table: 'table1', column: 'id' }
    });
};

exports.down = function() {
  return this.dropForeignKey('test_table2', 'table1id');
};
