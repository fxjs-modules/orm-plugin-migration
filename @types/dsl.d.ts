declare namespace FxOrmPlugin__MigrationDSL {
    interface Options__createTable {

    }

    interface Options__addColumn {

    }

    interface Options__addIndex {
        unique: boolean
        table: FxOrmSqlDDLSync.TableName
        columns: string[]// FxOrmSqlDDLSync__Column.ColumnInfo[]
    }

    interface Options__addForeignKey {

    }
}