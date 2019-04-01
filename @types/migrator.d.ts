/// <reference path="migration.d.ts" />

declare namespace FxOrmPlugin__Migrator {
    interface MigratorConstructorOptions {
        dir?: string
        coffee?: boolean
        logger?: Function
    }

    interface MigratorActionFunction extends Function {
        (this: Migrator, ...args: any): any
    }

    interface MigratorModule {
        file: string
        up: MigratorActionFunction
        down: MigratorActionFunction
    }

    class Migrator<T = FxOrmSqlDDLSync__Driver.Driver<FxSqlQuery.Class_Query>> {
        constructor (
            driver: FxOrmSqlDDLSync__Driver.Driver<FxSqlQuery.Class_Query>,
            opts?: FxOrmPlugin__Migrator.MigratorConstructorOptions
        );
        
        driver: T
        dir: MigratorConstructorOptions['dir']
        coffee: MigratorConstructorOptions['coffee']
        logger: MigratorConstructorOptions['logger']
        dsl?: FxOrmPlugin__MigrationDSL.MigrationDSL
        migration?: FxOrmPlugin__Migration.Migration

        up (migrationName: string, cb: FxOrmSqlDDLSync.ExecutionCallback<any>): void
        up (migrationName: string): PromiseLike<any>

        down (migrationName: string, cb: FxOrmSqlDDLSync.ExecutionCallback<any>): void
        down (migrationName: string): PromiseLike<any>

        generate (title: string, cb: FxOrmSqlDDLSync.ExecutionCallback<any>): void
        generate (title: string): PromiseLike<any>

        ensureMigrationsTable (cb: FxOrmSqlDDLSync.ExecutionCallback<any>): void
        ensureMigrationsTable (): PromiseLike<any>

        [k: string]: any
    }
}