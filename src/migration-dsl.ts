/// <reference path="../@types/index.d.ts" />

import _  = require("lodash");
import SqlDDLSync = require("@fxjs/sql-ddl-sync")
import { addPromiseInterface } from "./utils";
//lets you attach further metadata to column definition
//e.g. 'references product(id) on delete cascade'
var getColumnMetadata = function(property: FxOrmSqlDDLSync__Column.Property): "" | string {
  return property.hasOwnProperty('addSQL') ? property.addSQL : "";
};

// duplicated from sql-ddl-sync Sync closure
class MigrationDSL {
  driver: any
  Dialect: FxOrmSqlDDLSync__Dialect.Dialect
  
  constructor (driver: FxOrmSqlDDLSync__Driver.Driver) {
    this.driver           = driver;
    this.Dialect          = SqlDDLSync.dialect(driver.dialect);
    this.Dialect.escapeId = driver.query.escapeId;
  }

  /**
   * 
   * @param collection collection table name
   * @param name column name
   * @param property property descriptor
   * @param Dialect 
   * @param driver 
   */
  createColumn (
    collection: FxOrmSqlDDLSync.TableName,
    name: string,
    property: FxOrmSqlDDLSync__Column.Property,
    Dialect: FxOrmSqlDDLSync__Dialect.Dialect,
    driver: FxOrmSqlDDLSync__Driver.Driver
  ): false | FxOrmSqlDDLSync__Column.OpResult__CreateColumn {
    var type =  Dialect.getType(collection, property, driver);

    if (type === false) {
      return false;
    }
    if (typeof type == "string") {
      type = { value : type };
    }

    var meta = getColumnMetadata(property);

    return {
      value  : `${Dialect.escapeId(name)} ${type.value} ${meta}`,
      before : type.before
    };
  };

  // ----- Migration DSL functions
  // duplicated and altered from sql-ddl-sync Sync closure
  createTable <T = any> (
    collectionName: string,
    options: FxOrmPlugin__MigrationDSL.Options__createTable,
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
    const columns = [];
    let keys = [];

    for (let k in options) {
      const col = this.createColumn(collectionName, k, options[k], this.Dialect, this.driver);

      if (col === false) {
        return cb(new Error("Unknown type for property '" + k + "'"));
      }

      // `primary` is deprecated in favour of `key`
      if (options[k].key || options[k].primary) {
        keys.push(k);
      }

      if (typeof this.Dialect.processKeys == "function") {
        keys = this.Dialect.processKeys(keys);
      }

      columns.push(col.value);
    }

    this.Dialect.createCollection(this.driver, collectionName, columns, keys, cb);
  }

  addColumn <T = any>(
    collectionName: FxOrmSqlDDLSync.TableName,
    options: FxOrmPlugin__MigrationDSL.Options__addColumn,
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
    var columnName = _.keys(options)[0]
    var column = this.createColumn(collectionName, columnName, options[columnName], this.Dialect, this.driver);
    
    if (column)
      this.Dialect.addCollectionColumn(this.driver, collectionName, column.value, null, cb);
  }

  renameColumn <T = any>(
    collectionName: FxOrmSqlDDLSync.TableName,
    oldName: string,
    newName: string,
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
    this.Dialect.renameCollectionColumn(this.driver, collectionName, oldName, newName, cb);
  }

  addIndex <T = any>(
    indexName: string,
    options: FxOrmPlugin__MigrationDSL.Options__addIndex,
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
      this.Dialect.addIndex(this.driver, indexName, options.unique, options.table, options.columns, cb);
    }

  dropIndex <T = any>(
    collectionName: FxOrmSqlDDLSync.TableName,
    indexName: string,
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
    this.Dialect.removeIndex(this.driver, indexName, collectionName, cb);
  }

  dropColumn <T = any>(
    collectionName: FxOrmSqlDDLSync.TableName,
    columnName: string,
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
    this.Dialect.dropCollectionColumn(this.driver, collectionName, columnName, cb);
  }

  dropTable <T = any>(
    collectionName: FxOrmSqlDDLSync.TableName,
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
    this.Dialect.dropCollection(this.driver, collectionName, cb);
  }

  addPrimaryKey <T = any>(
    collectionName: FxOrmSqlDDLSync.TableName,
    columnName: string,
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
    this.Dialect.addPrimaryKey(this.driver, collectionName, columnName, cb);
  }

  dropPrimaryKey <T = any>(
    collectionName: FxOrmSqlDDLSync.TableName,
    columnName: string,
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
    this.Dialect.dropPrimaryKey(this.driver, collectionName, columnName, cb);
  }

  addForeignKey <T = any>(
    collectionName: FxOrmSqlDDLSync.TableName,
    options: FxOrmPlugin__MigrationDSL.Options__addForeignKey,
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
    this.Dialect.addForeignKey(this.driver, collectionName, options, cb);
  }

  dropForeignKey <T = any>(
    collectionName: FxOrmSqlDDLSync.TableName,
    columnName: string,
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
    this.Dialect.dropForeignKey(this.driver, collectionName, columnName, cb);
  }

  hasTable (
    collectionName: FxOrmSqlDDLSync.TableName,
    cb: FxOrmSqlDDLSync.ExecutionCallback<boolean>
  ) {
    this.Dialect.hasCollection(this.driver, collectionName, cb);
  }

  getColumns (
    collectionName: FxOrmSqlDDLSync.TableName,
    cb: FxOrmSqlDDLSync.ExecutionCallback<FxOrmSqlDDLSync__Column.ColumnInfoHash>
  ) {
    this.Dialect.getCollectionProperties(this.driver, collectionName, cb);
  }

  execQuery <T = any>(
    query: string,
    args: (string|number)[],
    cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  ) {
    this.driver.execQuery(query, args, cb);
  }

  // comment out for now
  // renameTable (
  //   oldCollectionName,
  //   newCollectionName,
  //   cb: FxOrmSqlDDLSync.ExecutionCallback<T>
  // ) {
  //   this.Dialect.renameTable(this.driver, oldCollectionName, newCollectionName, cb);
  // }
}

;[
  "createTable",
  "addColumn",
  "renameColumn",
  "addIndex",
  "dropIndex",
  "dropColumn",
  "dropTable",
  "addPrimaryKey",
  "addForeignKey",
  "dropPrimaryKey",
  "dropForeignKey",
  "hasTable",
  "getColumns",
  "execQuery"
].forEach(methodName => {
  MigrationDSL.prototype[methodName] = addPromiseInterface(MigrationDSL.prototype[methodName])
});

export = MigrationDSL
