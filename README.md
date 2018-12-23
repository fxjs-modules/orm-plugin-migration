## Migration Plugin for @fxjs/orm

[![NPM version](https://img.shields.io/npm/v/@fxjs/orm-plugin-migration.svg)](https://www.npmjs.org/package/@fxjs/orm-plugin-migration)
[![Build Status](https://travis-ci.org/fxjs-modules/orm-plugin-migration.svg)](https://travis-ci.org/fxjs-modules/orm-plugin-migration)
[![Build status](https://ci.appveyor.com/api/projects/status/plarvl262d7279c3?svg=true)](https://ci.appveyor.com/project/richardo2016/orm-plugin-migration)

## Install

```sh
npm install @fxjs/orm-plugin-migration
```

# @fxjs/orm-plugin-migration

Migrations using [@fxjs/orm](https://github.com/fxjs-modules/orm-plugin-migration) model DSL leveraging Visionmedia's node-migrate.

## Installation

```
npm install @fxjs/orm-plugin-migration
```

## Usage

The example below uses MySQL. Locomote uses @fxjs/orm-plugin-migration with Postgres. Testing was also done with SQLite3, though some driver issues were encountered.

Build a connection & construct the @fxjs/orm-plugin-migration Task object:

```js
var orm         = require('orm');
var MigrateTask = require('@fxjs/orm-plugin-migration');

orm.connect(connectionString, function (err, connection) {
  if (err) throw err;
  var task = new MigrateTask(connection.driver);
});
```

The Task constructor function can support options allowing for a custom migrations directory and/or coffeescript support (see 'Usage - opts' below).

A Task object offers three operations - *generate*, *up* and *down*.

## Usage - generate

```
> task.generate('create-users', function(err, result){});
>   create : @fxjs/orm-plugin-migration/migrations/001-create-users.js
```

The 'migrations' folder is the default but can be overridden in the opts argument (see 'Usage - opts' below).

A skeleton migration file now exists and can be populated with the [ORM2 DSL](https://github.com/fxjs-modules/sql-ddl-sync#example).

A simple example, taken from the tests:

```js
exports.up = function (next) {
  this.createTable('test_table', {
    id     : { type : "serial", key: true }, // auto increment
    name   : { type : "text", required: true }
  }, next);
};

exports.down = function (next){
  this.dropTable('test_table', next);
};
```

You can also write Promise-based migrations, same example, but with no callbacks specified:


```js
exports.up = function () {
  return this.createTable('test_table', {
    id     : { type : "serial", key: true }, // auto increment
    name   : { type : "text", required: true }
  });
};

exports.down = function (){
  return this.dropTable('test_table');
};
```
Both `createTable` and `dropTable`, along with other [MigrationDSL methods](lib/migration-dsl.js) return promises if callback is
not specified. Look [here](examples/migrations) for more examples.

Another example for adding or dropping a column:

```js
exports.up = function(next){
  this.addColumn('agency', preferredProvider: {type: "text", defaultValue: '1G', required: true}, next);
}

exports.down = function(next){
  this.dropColumn('agency', 'preferredProvider', next);
}
```

An example of adding an index:

```js
exports.up = function (next) {
  this.addIndex('agency_email_idx', {
    table: 'agency',
    columns: ['email'],
    unique: true
  }, next);
};

exports.down = function (next) {
  this.dropIndex('agency_email_idx', 'agency', next);
};
```

There are no built-in operations for inserting, updating, or deleting row data contained in tables. The ```execQuery``` operation, which can be used to execute any custom queries, can however be used to perform such actions:

```js
exports.up = function (next) {
  this.execQuery('INSERT INTO agency (email) VALUES (?)', ['info@example.com'], next);
};

exports.down = function (next) {
  this.execQuery('DELETE FROM agency WHERE email = ?', ['info@example.com'], next);
};
```

The full list of operations available through ```this```:

* createTable
* dropTable
* addColumn
* dropColumn
* addIndex
* dropIndex
* addPrimaryKey
* dropPrimaryKey
* addForeignKey
* dropForeignKey
* execQuery

These operations are depicted in the examples folder.

We would like to add modifyColumn functionality in the future.

## Usage - up
```
> task.up(function(e,r){});
>   up : migrations/001-create-users.js
  migration : complete
```

Alternatively, when there are many migrations, a filename can be specified:

```
> task.generate('create-servers', function(err, result){});
>   create : /Users/nicholasf/code/locomote/node-@fxjs/orm-plugin-migration/migrations/002-create-servers.js

> task.up('001-create-users.js', function(e,r){})
>   up : migrations/001-create-users.js
  migration : complete
```

This means 'run up to this migration then execute its up function, then stop.'

## Usage - down

```
> task.down(function(e,r){});
>   down : migrations/001-create-users.js
  migration : complete
```

This means 'rollback the last migration'.

If there are many migrations to rollback a limit can be specified.

```
> task.down('001-create-users.js', function(e,r){});
>   down : migrations/001-create-users.js
  migration : complete
```

This means 'rollback all migrations including 001-create-users.js'

## Usage - the orm_migrations table

Migrate-orm2 maintains an internal orm_migrations table which allows it to run from previous state.

The table contains a list of migrations applied to the database. By comparing these and the migration files, we can decide on which migrations to run.

```
mysql> select * from orm_migrations;
+---------------------+
| migration           |
+---------------------+
| 001-create-users.js |
+---------------------+
1 rows in set (0.00 sec)
```

## Usage - opts

The Task object can be modified to work from a different directory or to generate and cooperate with coffee-script migrations.

```
var task = new Task(connection, {dir: 'data/migrations', coffee: true});
```

## Running Tests

Please note - running all of the tests together can produce database connection pooling problems. We are currently considering these.

Tests work in isolation and when the database is tuned for a greater amount of database connections.

Create `test/config.js` (see `test/config.example.js` for instructions)

```bash
npm test
```
This will run the tests against all configurations inside `config.js`.
To run against a single config:
```bash
ORM_PROTOCOL=mysql node test/run
# OR
ORM_PROTOCOL=mysql mocha test/integration
```

## Guideline to Contributing

Contributions are welcome. If you want to discuss or request a feature, please open an issue.

We will ask for test coverage of Pull Requests for most issues. Please see the current testing strategy in test/integration.

## Credits