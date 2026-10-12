import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthCheckResponse } from '@voko/shared';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<HealthCheckResponse> {
    let dbStatus: 'up' | 'down' = 'down';
    let dbDetails = 'No inicializado';

    // Si no está inicializado, intentar reconectar bajo demanda
    if (!this.dataSource.isInitialized) {
      try {
        await this.dataSource.initialize();
        this.logger.log('✅ Conexión con PostgreSQL establecida bajo demanda.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        dbStatus = 'down';
        dbDetails = `No se pudo conectar a PostgreSQL: ${msg}. Inicie Docker con 'npm run docker:up'.`;
      }
    }

    if (this.dataSource.isInitialized) {
      try {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'up';
        dbDetails = 'PostgreSQL conectado y respondiendo a consultas (SELECT 1 OK).';
      } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : String(error);
        dbStatus = 'down';
        dbDetails = `Error al consultar PostgreSQL: ${errMessage}`;
        this.logger.warn(`Fallo en health check de base de datos: ${errMessage}`);
      }
    }

    const overallStatus: 'ok' | 'degraded' = dbStatus === 'up' ? 'ok' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: {
        status: dbStatus,
        type: 'PostgreSQL',
        details: dbDetails,
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
