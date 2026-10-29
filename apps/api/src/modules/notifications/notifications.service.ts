import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Between } from 'typeorm';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { InAppNotificationEntity } from '../../database/entities/in-app-notification.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { BranchEntity } from '../../database/entities/branch.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import {
  NotificationChannel,
  NotificationStatus,
  AppointmentStatus,
} from '@voko/shared';
import {
  NotificationQueryDto,
  CreateOutboxNotificationDto,
  InAppNotificationQueryDto,
  CreateInAppNotificationDto,
} from './dto/notification.dto';
import { OutboxProcessorService } from './outbox-processor.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly outboxProcessorService: OutboxProcessorService,
  ) {}

  /**
   * Inserta un registro en el Transactional Outbox.
   * Si se pasa un EntityManager, se ejecuta dentro de la transacción existente.
   */
  async createOutboxEntry(
    dto: CreateOutboxNotificationDto,
    transactionManager?: EntityManager,
  ): Promise<NotificationEntity> {
    const manager = transactionManager || this.dataSource.manager;

    const notif = manager.create(NotificationEntity, {
      businessId: dto.businessId,
      recipientUserId: dto.recipientUserId,
      recipientEmail: dto.recipientEmail,
      eventType: dto.eventType,
      channel: dto.channel || NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
      retryCount: 0,
      payload: dto.payload,
      scheduledAt: dto.scheduledAt || new Date(),
    });

    const saved = await manager.save(NotificationEntity, notif);
    this.logger.log(
      `📥 [Transactional Outbox] Notificación guardada en outbox con ID: ${saved.id} (Evento: ${saved.eventType})`,
    );
    return saved;
  }

  async findByBusiness(businessId: string, query?: NotificationQueryDto) {
    const notifRepo = this.dataSource.getRepository(NotificationEntity);

    const qb = notifRepo
      .createQueryBuilder('n')
      .where('n.business_id = :businessId', { businessId })
      .orderBy('n.created_at', 'DESC');

    if (query?.status) {
      qb.andWhere('n.status = :status', { status: query.status });
    }

    if (query?.channel) {
      qb.andWhere('n.channel = :channel', { channel: query.channel });
    }

    if (query?.eventType) {
      qb.andWhere('n.event_type = :eventType', { eventType: query.eventType });
    }

    const limit = query?.limit ? Number(query.limit) : 50;
    const offset = query?.offset ? Number(query.offset) : 0;

    qb.take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((i) => ({
        id: i.id,
        businessId: i.businessId,
        recipientEmail: i.recipientEmail,
        eventType: i.eventType,
        channel: i.channel,
        status: i.status,
        retryCount: i.retryCount,
        lastError: i.lastError,
        payload: i.payload,
        scheduledAt: i.scheduledAt,
        processedAt: i.processedAt,
        createdAt: i.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }

  async getStats(businessId: string) {
    const notifRepo = this.dataSource.getRepository(NotificationEntity);
    const inAppRepo = this.dataSource.getRepository(InAppNotificationEntity);

    const [total, pending, sent, retrying, failed, emailCount, inAppCount] = await Promise.all([
      notifRepo.count({ where: { businessId } }),
      notifRepo.count({ where: { businessId, status: NotificationStatus.PENDING } }),
      notifRepo.count({ where: { businessId, status: NotificationStatus.SENT } }),
      notifRepo.count({ where: { businessId, status: NotificationStatus.RETRYING } }),
      notifRepo.count({ where: { businessId, status: NotificationStatus.FAILED } }),
      notifRepo.count({ where: { businessId, channel: NotificationChannel.EMAIL } }),
      inAppRepo.count({ where: { businessId } }),
    ]);

    return {
      total,
      pending,
      sent,
      retrying,
      failed,
      deliverySuccessRate: total > 0 ? Math.round((sent / total) * 100) : 100,
      byChannel: {
        email: emailCount,
        inApp: inAppCount,
      },
    };
  }

  // ==========================================
  // NOTIFICACIONES INTERNAS (IN-APP)
  // ==========================================

  async createInAppNotification(
    dto: CreateInAppNotificationDto,
    transactionManager?: EntityManager,
  ): Promise<InAppNotificationEntity> {
    const manager = transactionManager || this.dataSource.manager;

    const notif = manager.create(InAppNotificationEntity, {
      businessId: dto.businessId,
      recipientUserId: dto.recipientUserId,
      targetRole: dto.targetRole,
      eventType: dto.eventType,
      title: dto.title,
      message: dto.message,
      data: dto.data,
      isRead: false,
    });

    const saved = await manager.save(InAppNotificationEntity, notif);
    this.logger.log(
      `🔔 [In-App Notification] Alerta creada para usuario ${dto.recipientUserId}: "${dto.title}"`,
    );
    return saved;
  }

  async findInAppNotifications(userId: string, query?: InAppNotificationQueryDto) {
    const inAppRepo = this.dataSource.getRepository(InAppNotificationEntity);

    const qb = inAppRepo
      .createQueryBuilder('n')
      .where('n.recipient_user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC');

    if (query?.isRead !== undefined) {
      qb.andWhere('n.is_read = :isRead', { isRead: query.isRead });
    }

    const limit = query?.limit ? Number(query.limit) : 50;
    const offset = query?.offset ? Number(query.offset) : 0;

    qb.take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    const unreadCount = await inAppRepo.count({
      where: { recipientUserId: userId, isRead: false },
    });

    return {
      items,
      total,
      unreadCount,
      limit,
      offset,
    };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const inAppRepo = this.dataSource.getRepository(InAppNotificationEntity);
    const unreadCount = await inAppRepo.count({
      where: { recipientUserId: userId, isRead: false },
    });
    return { unreadCount };
  }

  async markInAppNotificationAsRead(id: string, userId: string): Promise<InAppNotificationEntity> {
    const inAppRepo = this.dataSource.getRepository(InAppNotificationEntity);
    const notif = await inAppRepo.findOne({
      where: { id, recipientUserId: userId },
    });

    if (!notif) {
      throw new NotFoundException('Notificación interna no encontrada o no pertenece al usuario.');
    }

    notif.isRead = true;
    notif.readAt = new Date();
    return await inAppRepo.save(notif);
  }

  async markAllInAppNotificationsAsRead(userId: string): Promise<{ updatedCount: number }> {
    const inAppRepo = this.dataSource.getRepository(InAppNotificationEntity);
    const result = await inAppRepo.update(
      { recipientUserId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { updatedCount: result.affected || 0 };
  }

  /**
   * Genera recordatorios para citas confirmadas en las próximas 24 horas.
   * Evita duplicados verificando si ya existe un APPOINTMENT_REMINDER para la misma cita.
   */
  async generate24hReminders(businessId: string): Promise<{ remindersCreated: number; appointmentIds: string[] }> {
    const appRepo = this.dataSource.getRepository(AppointmentEntity);
    const notifRepo = this.dataSource.getRepository(NotificationEntity);
    const inAppRepo = this.dataSource.getRepository(InAppNotificationEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const bizRepo = this.dataSource.getRepository(BusinessEntity);
    const srvRepo = this.dataSource.getRepository(ServiceEntity);
    const branchRepo = this.dataSource.getRepository(BranchEntity);
    const resRepo = this.dataSource.getRepository(ResourceEntity);

    const business = await bizRepo.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException(`Negocio ${businessId} no encontrado`);
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000); // 20h adelante
    const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000);   // 28h adelante

    const upcomingAppointments = await appRepo.find({
      where: {
        businessId,
        status: AppointmentStatus.CONFIRMED,
        startTime: Between(windowStart, windowEnd),
      },
    });

    const createdIds: string[] = [];

    // Verificación de idempotencia en in_app_notifications y notifications
    const existingReminders = await notifRepo.find({
      where: {
        businessId,
        eventType: 'APPOINTMENT_REMINDER',
      },
    });

    const alreadyRemindedAppIds = new Set(
      existingReminders.map((r) => (r.payload as any)?.appointmentId).filter(Boolean),
    );

    for (const app of upcomingAppointments) {
      if (alreadyRemindedAppIds.has(app.id)) {
        continue;
      }

      const customer = await userRepo.findOne({ where: { id: app.customerId } });
      const service = await srvRepo.findOne({ where: { id: app.serviceId } });
      const branch = await branchRepo.findOne({ where: { id: app.branchId } });
      const resource = app.resourceId ? await resRepo.findOne({ where: { id: app.resourceId } }) : null;

      if (!customer) continue;

      // 1. Notificación interna para el cliente
      await this.createInAppNotification({
        businessId,
        recipientUserId: customer.id,
        targetRole: 'CUSTOMER',
        eventType: 'APPOINTMENT_REMINDER',
        title: 'Recordatorio de Turno Próximo',
        message: `Tienes un turno para ${service?.name || 'Servicio'} en ${business.name} dentro de las próximas 24 horas.`,
        data: {
          appointmentId: app.id,
          startTime: app.startTime.toISOString(),
          branchName: branch?.name,
          resourceName: resource?.name,
        },
      });

      // 2. Notificación interna para el profesional asignado (si existe)
      if (resource?.userId) {
        await this.createInAppNotification({
          businessId,
          recipientUserId: resource.userId,
          targetRole: 'STAFF',
          eventType: 'APPOINTMENT_REMINDER',
          title: 'Recordatorio de Turno Próximo',
          message: `Tienes un turno agendado con ${customer.firstName} ${customer.lastName} para mañana a las ${app.startTime.toISOString().substring(11, 16)} hs.`,
          data: {
            appointmentId: app.id,
            startTime: app.startTime.toISOString(),
          },
        });
      }

      // 3. Registro histórico en outbox
      await this.createOutboxEntry({
        businessId,
        recipientUserId: customer.id,
        recipientEmail: customer.email,
        eventType: 'APPOINTMENT_REMINDER',
        channel: NotificationChannel.IN_APP,
        payload: {
          appointmentId: app.id,
          businessName: business.name,
          customerName: `${customer.firstName} ${customer.lastName}`,
          serviceName: service?.name || 'Servicio',
          startTime: app.startTime.toISOString(),
          branchName: branch?.name || 'Sucursal Principal',
          branchAddress: branch?.address || '',
          resourceName: resource?.name || 'Profesional Asignado',
        },
      });

      createdIds.push(app.id);
    }

    return {
      remindersCreated: createdIds.length,
      appointmentIds: createdIds,
    };
  }

  async retryNotification(businessId: string, notificationId: string) {
    const notifRepo = this.dataSource.getRepository(NotificationEntity);
    const notif = await notifRepo.findOne({ where: { id: notificationId, businessId } });
    if (!notif) {
      throw new NotFoundException('Notificación no encontrada en este negocio');
    }

    return await this.outboxProcessorService.retrySingle(notificationId);
  }

  async processBatch() {
    return await this.outboxProcessorService.processPending();
  }
}
