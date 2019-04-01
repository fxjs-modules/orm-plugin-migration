declare namespace FxOrmPlugin__Migration {
    interface MigrationTableRow {
        migration: string
        direction: 'up' | 'down'
        created_at: Date
    }
    
    class Migration {
        log: Function
        dsl: FxOrmPlugin__MigrationDSL.MigrationDSL

        [k: string]: any
    }
}