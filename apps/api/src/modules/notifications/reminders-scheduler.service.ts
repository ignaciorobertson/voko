import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, LessThan } from 'typeorm';
import { BusinessEntity } from '../../database/entities/business.entity';
import { PasswordResetEntity } from '../../database/entities/password-reset.entity';
import { AuthSessionEntity } from '../../database/entities/auth-session.entity';
import { BusinessStatus } from '@voko/shared';
import { NotificationsService } from './notifications.service';

@Injectable()
export class RemindersSchedulerService {
  private readonly logger = new Logger(RemindersSchedulerService.name);
  private isRunningReminders = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Tarea programada: Escaneo periódico de citas de las próximas 24 horas.
   * Se ejecuta cada hora para generar alertas in-app a clientes y profesionales.
   * Posee bloqueo de ejecución concurrente e idempotencia relacional.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleUpcomingRemindersCron(): Promise<{ totalBusinessesProcessed: number; totalRemindersCreated: number }> {
    if (this.isRunningReminders) {
      this.logger.warn('El escaneo de recordatorios ya está en ejecución. Omitiendo ciclo concurrente.');
      return { totalBusinessesProcessed: 0, totalRemindersCreated: 0 };
    }

    this.isRunningReminders = true;
    let totalRemindersCreated = 0;
    let totalBusinessesProcessed = 0;

    try {
      const bizRepo = this.dataSource.getRepository(BusinessEntity);
      const activeBusinesses = await bizRepo.find({
        where: { status: BusinessStatus.ACTIVE },
        select: ['id', 'name'],
      });

      for (const biz of activeBusinesses) {
        try {
          const res = await this.notificationsService.generate24hReminders(biz.id);
          totalRemindersCreated += res.remindersCreated;
          totalBusinessesProcessed++;
        } catch (bizErr: any) {
          this.logger.error(`Error al generar recordatorios para negocio ${biz.name} (${biz.id}): ${bizErr.message}`);
        }
      }

      if (totalRemindersCreated > 0) {
        this.logger.log(
          `⏰ [Cron Recordatorios] ${totalRemindersCreated} alertas internas generadas para ${totalBusinessesProcessed} negocios activos.`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Error general en Cron de recordatorios: ${err.message}`);
    } finally {
      this.isRunningReminders = false;
    }

    return { totalBusinessesProcessed, totalRemindersCreated };
  }

  /**
   * Tarea programada: Limpieza nocturna de tokens de restablecimiento expirados
   * y sesiones revocadas antiguas (Transactional Outbox & Security Maintenance).
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMaintenanceCleanupCron(): Promise<{ expiredTokensDeleted: number; revokedSessionsDeleted: number }> {
    this.logger.log('🧹 [Cron Mantenimiento] Iniciando purga de tokens expirados y sesiones revocadas...');

    const resetRepo = this.dataSource.getRepository(PasswordResetEntity);
    const sessionRepo = this.dataSource.getRepository(AuthSessionEntity);

    const now = new Date();
    const tokenResult = await resetRepo.delete({
      expiresAt: LessThan(now),
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sessionResult = await sessionRepo.delete({
      isRevoked: true,
      updatedAt: LessThan(thirtyDaysAgo),
    });

    const expiredTokensDeleted = tokenResult.affected || 0;
    const revokedSessionsDeleted = sessionResult.affected || 0;

    this.logger.log(
      `🧹 [Cron Mantenimiento] Purga completada: ${expiredTokensDeleted} tokens expirados, ${revokedSessionsDeleted} sesiones antiguas eliminadas.`,
    );

    return { expiredTokensDeleted, revokedSessionsDeleted };
  }
}

