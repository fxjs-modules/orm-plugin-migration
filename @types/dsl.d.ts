declare namespace FxOrmPlugin__MigrationDSL {
    interface Properties__createTable {
        [k: string]: FxOrmSqlDDLSync__Column.Property
    }

    interface Properties__addColumn {
        [k: string]: FxOrmSqlDDLSync__Column.Property
    }

    interface Options__addIndex {
        unique: boolean
        table: FxOrmSqlDDLSync.TableName
        columns: string[]// FxOrmSqlDDLSync__Column.ColumnInfo[]
    }

    interface Options__addForeignKey {

    }
}