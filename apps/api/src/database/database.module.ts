import { Module, Global, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source';
import { ALL_ENTITIES } from './entities';
import { runDevSeeds } from './seeds/dev-seeds';

@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useFactory: async () => {
        const logger = new Logger('DatabaseConnection');
        const dataSource = new DataSource(dataSourceOptions);

        try {
          await dataSource.initialize();

          logger.log('✅ Conexión con PostgreSQL establecida exitosamente.');

          // Las migraciones se ejecutarán mediante el Pre-deploy
          // de Railway, no durante el inicio de la aplicación.

          return dataSource;
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);

          // SQLite solamente está permitido en desarrollo local.
          if (process.env.NODE_ENV !== 'development') {
            logger.error(
              `❌ No se pudo conectar con PostgreSQL. La aplicación no puede iniciar. Error: ${msg}`,
            );

            throw error;
          }

          logger.warn(
            `⚠️ PostgreSQL no disponible (${msg}). Activando SQLite en memoria para desarrollo local...`,
          );

          const sqliteDataSource = new DataSource({
            type: 'better-sqlite3',
            database: ':memory:',
            entities: ALL_ENTITIES,
            synchronize: true,
            logging: false,
          });

          await sqliteDataSource.initialize();

          try {
            await runDevSeeds(sqliteDataSource);
            logger.log(
              '✅ Semillas iniciales inyectadas exitosamente en SQLite.',
            );
          } catch (seedError: unknown) {
            const seedMsg =
              seedError instanceof Error
                ? seedError.message
                : String(seedError);

            logger.warn(`⚠️ Semillas locales omitidas: ${seedMsg}`);
          }

          return sqliteDataSource;
        }
      },
    },
  ],
  exports: [DataSource],
})
export class DatabaseModule { }