import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Between } from 'typeorm';
import { NotificationEntity } from '../../database/entities/notification.entity';
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
      channel: dto.channel || NotificationChannel.EMAIL,
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

    const [total, pending, sent, retrying, failed, emailCount, webhookCount] = await Promise.all([
      notifRepo.count({ where: { businessId } }),
      notifRepo.count({ where: { businessId, status: NotificationStatus.PENDING } }),
      notifRepo.count({ where: { businessId, status: NotificationStatus.SENT } }),
      notifRepo.count({ where: { businessId, status: NotificationStatus.RETRYING } }),
      notifRepo.count({ where: { businessId, status: NotificationStatus.FAILED } }),
      notifRepo.count({ where: { businessId, channel: NotificationChannel.EMAIL } }),
      notifRepo.count({ where: { businessId, channel: NotificationChannel.N8N_WEBHOOK } }),
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
        webhook: webhookCount,
      },
    };
  }

  /**
   * Genera recordatorios para citas confirmadas en las próximas 24 horas.
   * Evita duplicados verificando si ya existe un APPOINTMENT_REMINDER para la misma cita.
   */
  async generate24hReminders(businessId: string): Promise<{ remindersCreated: number; appointmentIds: string[] }> {
    const appRepo = this.dataSource.getRepository(AppointmentEntity);
    const notifRepo = this.dataSource.getRepository(NotificationEntity);
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

      if (!customer?.email) continue;

      await this.createOutboxEntry({
        businessId,
        recipientUserId: customer.id,
        recipientEmail: customer.email,
        eventType: 'APPOINTMENT_REMINDER',
        channel: NotificationChannel.EMAIL,
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
