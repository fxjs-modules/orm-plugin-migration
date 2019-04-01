/// <reference types="fibjs" />
/// <reference types="@fxjs/sql-query" />
/// <reference types="@fxjs/sql-ddl-sync" />

/// <reference path="dsl.d.ts" />
/// <reference path="migrator.d.ts" />
/// <reference path="migration.d.ts" />

declare module "@fxjs/orm-plugin-migration" {
    export = FxOrmPlugin__Migrator.Migrator
}