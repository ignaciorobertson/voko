import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In, LessThanOrEqual } from 'typeorm';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { NotificationStatus } from '@voko/shared';

export interface ProcessBatchResult {
  totalProcessed: number;
  sentCount: number;
  retryingCount: number;
  failedCount: number;
}

@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private maxRetries = 3;
  private baseBackoffSeconds = 2;

  constructor(
    private readonly dataSource: DataSource,
  ) {}

  setMaxRetries(max: number): void {
    this.maxRetries = max;
  }

  setBaseBackoffSeconds(seconds: number): void {
    this.baseBackoffSeconds = seconds;
  }

  /**
   * Procesa la cola de Transactional Outbox para notificaciones pendientes o en reintento.
   */
  async processPending(limit = 25): Promise<ProcessBatchResult> {
    const notificationRepo = this.dataSource.getRepository(NotificationEntity);

    // Buscar notificaciones listas para despacho
    const pendingNotifications = await notificationRepo.find({
      where: {
        status: In([NotificationStatus.PENDING, NotificationStatus.RETRYING]),
        scheduledAt: LessThanOrEqual(new Date()),
      },
      order: {
        scheduledAt: 'ASC',
      },
      take: limit,
    });

    const result: ProcessBatchResult = {
      totalProcessed: pendingNotifications.length,
      sentCount: 0,
      retryingCount: 0,
      failedCount: 0,
    };

    if (pendingNotifications.length === 0) {
      return result;
    }

    this.logger.log(`Procesando lote de ${pendingNotifications.length} notificaciones del Outbox...`);

    for (const notif of pendingNotifications) {
      const outcome = await this.dispatchNotification(notif);
      if (outcome === NotificationStatus.SENT) result.sentCount++;
      else if (outcome === NotificationStatus.RETRYING) result.retryingCount++;
      else if (outcome === NotificationStatus.FAILED) result.failedCount++;
    }

    return result;
  }

  /**
   * Ejecuta el despacho seguro e idempotente de una notificación individual en el Outbox.
   */
  async dispatchNotification(notification: NotificationEntity): Promise<NotificationStatus> {
    const notificationRepo = this.dataSource.getRepository(NotificationEntity);

    try {
      // Procesamiento atómico interno de eventos en base de datos
      notification.status = NotificationStatus.SENT;
      notification.processedAt = new Date();
      notification.lastError = undefined;
      await notificationRepo.save(notification);

      this.logger.log(`✅ [Outbox] Notificación interna ${notification.id} procesada exitosamente como SENT`);
      return NotificationStatus.SENT;
    } catch (err: unknown) {
      const errorDescription = err instanceof Error ? err.message : String(err);
      notification.retryCount = (notification.retryCount || 0) + 1;

      if (notification.retryCount < this.maxRetries) {
        notification.status = NotificationStatus.RETRYING;
        const delaySeconds = Math.pow(2, notification.retryCount) * this.baseBackoffSeconds;
        notification.scheduledAt = new Date(Date.now() + delaySeconds * 1000);
        notification.lastError = `Intento ${notification.retryCount}/${this.maxRetries} fallido: ${errorDescription}`;

        this.logger.warn(
          `⚠️ [Outbox] Notificación ${notification.id} reprogramada en RETRYING para dentro de ${delaySeconds}s (Reintento ${notification.retryCount})`,
        );
      } else {
        notification.status = NotificationStatus.FAILED;
        notification.lastError = `Máximo de reintentos alcanzado (${this.maxRetries}). Último error: ${errorDescription}`;
        this.logger.error(`❌ [Outbox] Notificación ${notification.id} marcada como FAILED tras ${this.maxRetries} reintentos`);
      }

      await notificationRepo.save(notification);
      return notification.status;
    }
  }

  /**
   * Reintenta forzosamente una notificación individual
   */
  async retrySingle(notificationId: string): Promise<NotificationEntity> {
    const notificationRepo = this.dataSource.getRepository(NotificationEntity);
    const notif = await notificationRepo.findOne({ where: { id: notificationId } });

    if (!notif) {
      throw new Error(`Notificación ${notificationId} no encontrada`);
    }

    await this.dispatchNotification(notif);
    return (await notificationRepo.findOne({ where: { id: notificationId } })) || notif;
  }
}
