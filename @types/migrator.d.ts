declare namespace FxOrmPlugin__Migrator {
    interface MigratorConstructorOptions {
        dir?: string
        coffee?: boolean
        logger?: Function
    }

    interface MigratorModule {
        file: string
        up: Function
        down: Function
    }
}