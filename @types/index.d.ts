/// <reference types="fibjs" />
/// <reference types="@fxjs/sql-query" />
/// <reference types="@fxjs/sql-ddl-sync" />

/// <reference path="dsl.d.ts" />
/// <reference path="migrator.d.ts" />

declare namespace FxOrmPlugin__Migration {
    interface MigrationTableRow {
        migration: string
        direction: 'up' | 'down'
        created_at: Date
    }
}