import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In, LessThanOrEqual } from 'typeorm';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { NotificationStatus, NotificationChannel } from '@voko/shared';
import { TemplatesService } from './templates.service';
import { EmailSenderService } from './email-sender.service';

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
  private baseBackoffSeconds = 2; // Base para 2^retryCount (2s, 4s, 8s en tests)

  constructor(
    private readonly dataSource: DataSource,
    private readonly templatesService: TemplatesService,
    private readonly emailSenderService: EmailSenderService,
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
   * Ejecuta el despacho seguro e idempotente de una notificación individual.
   */
  async dispatchNotification(notification: NotificationEntity): Promise<NotificationStatus> {
    const notificationRepo = this.dataSource.getRepository(NotificationEntity);

    try {
      let isSuccess = false;
      let errorDescription: string | undefined;

      // Canal EMAIL (ej. para tareas outbox asíncronas de email)
      if (notification.channel === NotificationChannel.EMAIL) {
        const rendered = this.templatesService.render(
          notification.eventType,
          notification.payload,
        );

        const sendRes = await this.emailSenderService.sendEmail({
          to: notification.recipientEmail,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });

        isSuccess = sendRes.success;
        errorDescription = sendRes.error;
      } else {
        // Para canales internos no-email (o IN_APP), se marca como procesado
        isSuccess = true;
      }

      if (isSuccess) {
        // Marcado Atómico Exitoso (SENT)
        notification.status = NotificationStatus.SENT;
        notification.processedAt = new Date();
        notification.lastError = undefined;
        await notificationRepo.save(notification);

        this.logger.log(`✅ [Outbox] Notificación ${notification.id} despachada como SENT`);
        return NotificationStatus.SENT;
      } else {
        // Manejo de Error y Backoff Exponencial
        notification.retryCount = (notification.retryCount || 0) + 1;

        if (notification.retryCount < this.maxRetries) {
          notification.status = NotificationStatus.RETRYING;
          const delaySeconds = Math.pow(2, notification.retryCount) * this.baseBackoffSeconds;
          notification.scheduledAt = new Date(Date.now() + delaySeconds * 1000);
          notification.lastError = `Intento ${notification.retryCount}/${this.maxRetries} fallido: ${errorDescription || 'Error no especificado'}`;

          this.logger.warn(
            `⚠️ [Outbox] Notificación ${notification.id} reprogramada en RETRYING para dentro de ${delaySeconds}s (Reintento ${notification.retryCount})`,
          );
        } else {
          notification.status = NotificationStatus.FAILED;
          notification.lastError = `Máximo de reintentos alcanzado (${this.maxRetries}). Último error: ${errorDescription || 'Error de despacho'}`;
          this.logger.error(`❌ [Outbox] Notificación ${notification.id} marcada como FAILED tras ${this.maxRetries} reintentos`);
        }

        await notificationRepo.save(notification);
        return notification.status;
      }
    } catch (err: any) {
      notification.retryCount = (notification.retryCount || 0) + 1;
      notification.status =
        notification.retryCount >= this.maxRetries
          ? NotificationStatus.FAILED
          : NotificationStatus.RETRYING;
      notification.lastError = `Excepción no controlada: ${err.message}`;
      await notificationRepo.save(notification);
      return notification.status;
    }
  }

  /**
   * Reintenta manualmente una notificación fallida, reseteando su contador y procesándola inmediatamente.
   */
  async retrySingle(notificationId: string): Promise<NotificationEntity> {
    const notificationRepo = this.dataSource.getRepository(NotificationEntity);
    const notification = await notificationRepo.findOne({ where: { id: notificationId } });

    if (!notification) {
      throw new Error(`Notificación con ID ${notificationId} no encontrada`);
    }

    notification.status = NotificationStatus.PENDING;
    notification.retryCount = 0;
    notification.scheduledAt = new Date();
    notification.lastError = undefined;
    await notificationRepo.save(notification);

    await this.dispatchNotification(notification);
    return (await notificationRepo.findOne({ where: { id: notificationId } })) || notification;
  }
}
