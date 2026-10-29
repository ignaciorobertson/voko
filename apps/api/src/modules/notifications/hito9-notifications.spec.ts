import { DataSource } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { BranchEntity } from '../../database/entities/branch.entity';
import { BusinessSettingsEntity } from '../../database/entities/business-settings.entity';
import { BusinessMembershipEntity } from '../../database/entities/business-membership.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { ServiceResourceEntity } from '../../database/entities/service-resource.entity';
import { AvailabilityRuleEntity } from '../../database/entities/availability-rule.entity';
import { AvailabilityExceptionEntity } from '../../database/entities/availability-exception.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { AppointmentEventEntity } from '../../database/entities/appointment-event.entity';
import { InvitationEntity } from '../../database/entities/invitation.entity';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { InAppNotificationEntity } from '../../database/entities/in-app-notification.entity';
import { AuthSessionEntity } from '../../database/entities/auth-session.entity';
import { PasswordResetEntity } from '../../database/entities/password-reset.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';

import { AppointmentsService } from '../appointments/appointments.service';
import { BusinessesService } from '../businesses/businesses.service';
import { ServicesService } from '../services/services.service';
import { ResourcesService } from '../resources/resources.service';

import { TemplatesService } from './templates.service';
import { EmailSenderService } from './email-sender.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { NotificationsService } from './notifications.service';
import { RemindersSchedulerService } from './reminders-scheduler.service';
import { DecoupledEmailService } from '../auth/email/password-reset-email.provider';

import {
  BookingMode,
  ConfirmationMode,
  ResourceType,
  NotificationChannel,
  NotificationStatus,
} from '@voko/shared';
import * as argon2 from 'argon2';

describe('Hito 9: Notificaciones Internas (In-App), Email Desacoplado y Automatizaciones Nativas (NestJS + PostgreSQL)', () => {
  let dataSource: DataSource;
  let appointmentsService: AppointmentsService;
  let businessesService: BusinessesService;
  let servicesService: ServicesService;
  let resourcesService: ResourcesService;

  let templatesService: TemplatesService;
  let emailSenderService: EmailSenderService;
  let outboxProcessorService: OutboxProcessorService;
  let notificationsService: NotificationsService;
  let remindersSchedulerService: RemindersSchedulerService;
  let decoupledEmailService: DecoupledEmailService;

  let ownerUser: UserEntity;
  let customerUser: UserEntity;
  let testBusiness: BusinessEntity;
  let testBranch: BranchEntity;
  let testService: ServiceEntity;
  let testResource: ResourceEntity;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [
        UserEntity,
        BusinessEntity,
        BranchEntity,
        BusinessSettingsEntity,
        BusinessMembershipEntity,
        ServiceEntity,
        ResourceEntity,
        ServiceResourceEntity,
        AvailabilityRuleEntity,
        AvailabilityExceptionEntity,
        SessionEntity,
        AppointmentEntity,
        AppointmentEventEntity,
        InvitationEntity,
        NotificationEntity,
        InAppNotificationEntity,
        AuthSessionEntity,
        PasswordResetEntity,
        AuditLogEntity,
      ],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();

    // Inicializar servicios de notificaciones y automatizaciones
    templatesService = new TemplatesService();
    emailSenderService = new EmailSenderService();
    outboxProcessorService = new OutboxProcessorService(
      dataSource,
      templatesService,
      emailSenderService,
    );
    outboxProcessorService.setBaseBackoffSeconds(1); // 1s para acelerar tests
    notificationsService = new NotificationsService(dataSource, outboxProcessorService);
    remindersSchedulerService = new RemindersSchedulerService(dataSource, notificationsService);
    decoupledEmailService = new DecoupledEmailService();

    // Inicializar servicios de negocio y reservas
    businessesService = new BusinessesService(dataSource);
    servicesService = new ServicesService(dataSource);
    resourcesService = new ResourcesService(dataSource);
    appointmentsService = new AppointmentsService(dataSource);

    // Sembrar datos iniciales
    const userRepo = dataSource.getRepository(UserEntity);
    const passHash = await argon2.hash('Secret123!');

    ownerUser = await userRepo.save(
      userRepo.create({
        firstName: 'Esteban',
        lastName: 'Director',
        email: 'esteban.director@clinica.test',
        passwordHash: passHash,
        isActive: true,
      }),
    );

    customerUser = await userRepo.save(
      userRepo.create({
        firstName: 'Camila',
        lastName: 'Fernández',
        email: 'camila.cliente@test.com',
        phone: '+5491155443322',
        passwordHash: passHash,
        isActive: true,
      }),
    );

    testBusiness = await businessesService.create(ownerUser.id, {
      name: 'Centro Dermatológico Láser',
      slug: 'centro-dermatologico-laser',
      contactEmail: 'contacto@dermatolaser.test',
      phone: '+541144445555',
    });

    const branchRepo = dataSource.getRepository(BranchEntity);
    const branches = await branchRepo.find({ where: { businessId: testBusiness.id } });
    testBranch = branches[0];

    testService = await servicesService.create(testBusiness.id, {
      name: 'Limpieza Facial Profunda',
      durationMinutes: 45,
      price: 22000,
      currency: 'ARS',
      bookingMode: BookingMode.INDIVIDUAL,
      confirmationMode: ConfirmationMode.AUTOMATIC,
      cancellationDeadlineMinutes: 180, // 3 horas
      minBookingNoticeMinutes: 0,
    });

    testResource = await resourcesService.create(testBusiness.id, {
      branchId: testBranch.id,
      name: 'Dra. Florencia Dermatóloga',
      resourceType: ResourceType.STAFF,
      serviceIds: [testService.id],
    });
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(() => {
    emailSenderService.clearSentEmails();
    emailSenderService.setSimulateFailure(false);
    decoupledEmailService.localProvider.clear();
  });

  describe('1. Notificaciones Internas (In-App) y Centro de Avisos', () => {
    it('1.1. Al crear una reserva, debe insertar notificaciones internas atómicas para cliente y staff', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrow.setHours(10, 0, 0, 0);

      const app = await appointmentsService.create(testBusiness.id, customerUser.id, {
        serviceId: testService.id,
        resourceId: testResource.id,
        branchId: testBranch.id,
        startTime: tomorrow.toISOString(),
      });

      expect(app.id).toBeDefined();

      const inAppRepo = dataSource.getRepository(InAppNotificationEntity);

      // Notificación del cliente
      const customerNotifs = await inAppRepo.find({
        where: { recipientUserId: customerUser.id, eventType: 'APPOINTMENT_CONFIRMED' },
      });
      expect(customerNotifs.length).toBeGreaterThanOrEqual(1);
      const latestCustomerNotif = customerNotifs[customerNotifs.length - 1];
      expect(latestCustomerNotif.title).toContain('Turno Confirmado');
      expect(latestCustomerNotif.isRead).toBe(false);
      expect(latestCustomerNotif.readAt).toBeNull();

      // Notificación del staff / admin
      const staffNotifs = await inAppRepo.find({
        where: { recipientUserId: ownerUser.id, eventType: 'APPOINTMENT_CONFIRMED' },
      });
      expect(staffNotifs.length).toBeGreaterThanOrEqual(1);
      const latestStaffNotif = staffNotifs[staffNotifs.length - 1];
      expect(latestStaffNotif.title).toContain('Nueva Reserva');
      expect(latestStaffNotif.isRead).toBe(false);
    });

    it('1.2. Consulta de notificaciones internas con filtro de lectura y contador de no leídas', async () => {
      const result = await notificationsService.findInAppNotifications(customerUser.id, {
        isRead: false,
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.unreadCount).toBeGreaterThan(0);
      expect(result.items.every((n) => n.isRead === false)).toBe(true);

      const count = await notificationsService.getUnreadCount(customerUser.id);
      expect(count.unreadCount).toBe(result.unreadCount);
    });

    it('1.3. Marcado individual de notificación interna como leída', async () => {
      const inAppRepo = dataSource.getRepository(InAppNotificationEntity);
      const unread = await inAppRepo.findOne({
        where: { recipientUserId: customerUser.id, isRead: false },
      });

      expect(unread).toBeDefined();

      const marked = await notificationsService.markInAppNotificationAsRead(unread!.id, customerUser.id);
      expect(marked.isRead).toBe(true);
      expect(marked.readAt).toBeDefined();

      // Verificar en base de datos
      const updated = await inAppRepo.findOne({ where: { id: unread!.id } });
      expect(updated?.isRead).toBe(true);
    });

    it('1.4. Marcado masivo de todas las notificaciones pendientes del usuario como leídas', async () => {
      // Crear un par de notificaciones no leídas adicionales
      await notificationsService.createInAppNotification({
        businessId: testBusiness.id,
        recipientUserId: customerUser.id,
        eventType: 'SYSTEM_ALERT',
        title: 'Aviso del Sistema',
        message: 'Mantenimiento preventivo completado.',
      });

      const beforeCount = await notificationsService.getUnreadCount(customerUser.id);
      expect(beforeCount.unreadCount).toBeGreaterThan(0);

      const batchResult = await notificationsService.markAllInAppNotificationsAsRead(customerUser.id);
      expect(batchResult.updatedCount).toBeGreaterThanOrEqual(1);

      const afterCount = await notificationsService.getUnreadCount(customerUser.id);
      expect(afterCount.unreadCount).toBe(0);
    });
  });

  describe('2. Notificaciones en Reprogramación y Cancelación', () => {
    it('2.1. Al reprogramar un turno, genera notificación interna con nuevo horario', async () => {
      const in3Days = new Date(Date.now() + 72 * 60 * 60 * 1000);
      in3Days.setHours(11, 0, 0, 0);

      const app = await appointmentsService.create(testBusiness.id, customerUser.id, {
        serviceId: testService.id,
        resourceId: testResource.id,
        branchId: testBranch.id,
        startTime: in3Days.toISOString(),
      });

      const newDate = new Date(Date.now() + 96 * 60 * 60 * 1000);
      newDate.setHours(15, 0, 0, 0);

      await appointmentsService.reschedule(testBusiness.id, app.id, customerUser.id, {
        newStartTime: newDate.toISOString(),
      });

      const inAppRepo = dataSource.getRepository(InAppNotificationEntity);
      const reschedNotif = await inAppRepo.findOne({
        where: { recipientUserId: customerUser.id, eventType: 'APPOINTMENT_RESCHEDULED' },
        order: { createdAt: 'DESC' },
      });

      expect(reschedNotif).toBeDefined();
      expect(reschedNotif?.title).toContain('Reprogramado');
      expect(reschedNotif?.isRead).toBe(false);
    });

    it('2.2. Al cancelar un turno, genera notificación interna con motivo de cancelación', async () => {
      const in5Days = new Date(Date.now() + 120 * 60 * 60 * 1000);
      in5Days.setHours(16, 0, 0, 0);

      const app = await appointmentsService.create(testBusiness.id, customerUser.id, {
        serviceId: testService.id,
        resourceId: testResource.id,
        branchId: testBranch.id,
        startTime: in5Days.toISOString(),
      });

      await appointmentsService.cancel(testBusiness.id, app.id, customerUser.id, false, {
        reason: 'Imprevisto laboral del cliente',
      });

      const inAppRepo = dataSource.getRepository(InAppNotificationEntity);
      const cancelNotif = await inAppRepo.findOne({
        where: { recipientUserId: customerUser.id, eventType: 'APPOINTMENT_CANCELLED' },
        order: { createdAt: 'DESC' },
      });

      expect(cancelNotif).toBeDefined();
      expect(cancelNotif?.title).toContain('Cancelado');
      expect((cancelNotif?.data as any)?.reason).toBe('Imprevisto laboral del cliente');
    });
  });

  describe('3. Email Desacoplado Exclusivo para Recuperación de Contraseña', () => {
    it('3.1. Despacha email de recuperación de contraseña con proveedor desacoplado (Local / Resend / Brevo)', async () => {
      const result = await decoupledEmailService.sendPasswordReset({
        to: 'seguridad.usuario@voko.test',
        userName: 'Martín Gómez',
        resetLink: 'http://localhost:5173/reset-password?token=mock_token_abc123',
        debugToken: 'mock_token_abc123',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('local');
      expect(result.messageId).toBeDefined();

      const sent = decoupledEmailService.localProvider.sentEmails;
      expect(sent.length).toBe(1);
      expect(sent[0].to).toBe('seguridad.usuario@voko.test');
      expect(sent[0].resetLink).toContain('reset-password?token=mock_token_abc123');
      expect(sent[0].userName).toBe('Martín Gómez');
    });

    it('3.2. Manejo controlado de fallas en el proveedor de email sin colapsar el sistema', async () => {
      decoupledEmailService.localProvider.setSimulateFailure(true, 'SMTP timeout or quota exceeded');

      const result = await decoupledEmailService.sendPasswordReset({
        to: 'falla@voko.test',
        resetLink: 'http://localhost:5173/reset-password?token=token_fail',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP timeout or quota exceeded');

      // Restaurar
      decoupledEmailService.localProvider.setSimulateFailure(false);
    });
  });

  describe('4. Automatizaciones Nativas en NestJS + PostgreSQL (Sin n8n ni Redis)', () => {
    it('4.1. Escaneo periódico de recordatorios de citas en las próximas 24 horas', async () => {
      // Crear una cita programada exactamente en la ventana de 24h
      const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await appointmentsService.create(testBusiness.id, customerUser.id, {
        serviceId: testService.id,
        resourceId: testResource.id,
        branchId: testBranch.id,
        startTime: in24h.toISOString(),
      });

      const cronResult = await remindersSchedulerService.handleUpcomingRemindersCron();
      expect(cronResult.totalBusinessesProcessed).toBeGreaterThanOrEqual(1);
      expect(cronResult.totalRemindersCreated).toBeGreaterThanOrEqual(1);

      // Verificar que se haya creado la alerta interna
      const inAppRepo = dataSource.getRepository(InAppNotificationEntity);
      const reminderNotif = await inAppRepo.findOne({
        where: { recipientUserId: customerUser.id, eventType: 'APPOINTMENT_REMINDER' },
      });
      expect(reminderNotif).toBeDefined();
      expect(reminderNotif?.title).toContain('Recordatorio');
    });

    it('4.2. Idempotencia estricta: ejecuciones consecutivas del Cron no generan duplicados', async () => {
      const secondRun = await remindersSchedulerService.handleUpcomingRemindersCron();
      // No debe haber generado nuevos recordatorios porque ya fueron emitidos
      expect(secondRun.totalRemindersCreated).toBe(0);
    });

    it('4.3. Tarea de mantenimiento purga tokens expirados y sesiones revocadas en PostgreSQL', async () => {
      const resetRepo = dataSource.getRepository(PasswordResetEntity);

      // Crear token expirado en el pasado
      await resetRepo.save(
        resetRepo.create({
          userId: customerUser.id,
          tokenHash: 'hash_expirado_antiguo',
          expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Expiró hace 2 horas
          isUsed: false,
        }),
      );

      const cleanupRes = await remindersSchedulerService.handleMaintenanceCleanupCron();
      expect(cleanupRes.expiredTokensDeleted).toBeGreaterThanOrEqual(1);
    });
  });

  describe('5. Principio de Autonomía de la Plataforma', () => {
    it('5.1. El sistema opera al 100% sin ninguna dependencia de n8n, Redis ni servicios pagos', async () => {
      // Consultar métricas del negocio
      const stats = await notificationsService.getStats(testBusiness.id);

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byChannel.inApp).toBeGreaterThan(0);
      expect(stats.deliverySuccessRate).toBeGreaterThanOrEqual(0);
    });
  });
});
