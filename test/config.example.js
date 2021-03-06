// To test, copy this file to test/config.js and update the configuration.
//
// To run a single driver, go to root folder and:
// ORM_PROTOCOL=mysql fibjs test/run
//
// To run all drivers:
// fibjs test/run OR npm test

// exports.mysql = {
//   protocol : 'mysql',
//   user     : "root",
//   password : "",
//   query    : {},
//   database : 'test',
//   host     : '127.0.0.1',
//   port     : 3306
// };
exports.mysql = "mysql://root:@127.0.0.1:3306/orm_migration_test"

// exports.postgresql = {
//   protocol : 'postgresql',
//   username : "postgres",
//   password : "",
//   query    : {},
//   database : 'orm_migration_test',
//   host     : '127.0.0.1',
//   port     : 5432
// };

exports.sqlite = 'sqlite:test.db'