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
        let dataSource = new DataSource(dataSourceOptions);
        try {
          await dataSource.initialize();
          logger.log('✅ Conexión con PostgreSQL establecida exitosamente.');
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.warn(
            `⚠️ PostgreSQL no disponible (${msg}). Activando motor local SQLite en memoria con semillas para desarrollo...`,
          );
          dataSource = new DataSource({
            type: 'better-sqlite3',
            database: ':memory:',
            entities: ALL_ENTITIES,
            synchronize: true,
            logging: false,
          });
          await dataSource.initialize();
          try {
            await runDevSeeds(dataSource);
            logger.log('✅ Semillas iniciales inyectadas exitosamente en base de datos local.');
          } catch {
            logger.warn('Nota: Semillas locales omitidas o ya existentes.');
          }
        }
        return dataSource;
      },
    },
  ],
  exports: [DataSource],
})
export class DatabaseModule {}
