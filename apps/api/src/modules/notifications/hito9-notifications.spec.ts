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
import { AuthSessionEntity } from '../../database/entities/auth-session.entity';
import { PasswordResetEntity } from '../../database/entities/password-reset.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';

import { AppointmentsService } from '../appointments/appointments.service';
import { BusinessesService } from '../businesses/businesses.service';
import { ServicesService } from '../services/services.service';
import { ResourcesService } from '../resources/resources.service';

import { TemplatesService } from './templates.service';
import { EmailSenderService } from './email-sender.service';
import { N8nSenderService } from './n8n-sender.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { NotificationsService } from './notifications.service';

import {
  BookingMode,
  ConfirmationMode,
  ResourceType,
  AppointmentStatus,
  NotificationChannel,
  NotificationStatus,
} from '@voko/shared';
import * as argon2 from 'argon2';

describe('Hito 9: Notificaciones, Correos, Transactional Outbox y Automatizaciones', () => {
  let dataSource: DataSource;
  let appointmentsService: AppointmentsService;
  let businessesService: BusinessesService;
  let servicesService: ServicesService;
  let resourcesService: ResourcesService;

  let templatesService: TemplatesService;
  let emailSenderService: EmailSenderService;
  let n8nSenderService: N8nSenderService;
  let outboxProcessorService: OutboxProcessorService;
  let notificationsService: NotificationsService;

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
        AuthSessionEntity,
        PasswordResetEntity,
        AuditLogEntity,
      ],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();

    // Inicializar servicios de notificaciones
    templatesService = new TemplatesService();
    emailSenderService = new EmailSenderService();
    n8nSenderService = new N8nSenderService();
    outboxProcessorService = new OutboxProcessorService(
      dataSource,
      templatesService,
      emailSenderService,
      n8nSenderService,
    );
    outboxProcessorService.setBaseBackoffSeconds(1); // 1s para acelerar tests
    notificationsService = new NotificationsService(dataSource, outboxProcessorService);

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
    n8nSenderService.clearDispatchedWebhooks();
    n8nSenderService.setSimulateFailure(false);
  });

  describe('1. Desacoplamiento y Transactional Outbox (Criterio 1)', () => {
    it('1.1. Al crear una reserva, debe insertar atómicamente un registro en notifications (PENDING)', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrow.setHours(10, 0, 0, 0);

      const app = await appointmentsService.create(testBusiness.id, customerUser.id, {
        serviceId: testService.id,
        resourceId: testResource.id,
        branchId: testBranch.id,
        startTime: tomorrow.toISOString(),
      });

      expect(app.id).toBeDefined();

      const notifRepo = dataSource.getRepository(NotificationEntity);
      const outboxEntries = await notifRepo.find({
        where: { businessId: testBusiness.id, recipientEmail: customerUser.email },
      });

      expect(outboxEntries.length).toBeGreaterThanOrEqual(1);
      const latest = outboxEntries[outboxEntries.length - 1];

      expect(latest.status).toBe(NotificationStatus.PENDING);
      expect(latest.eventType).toBe('APPOINTMENT_CONFIRMED');
      expect(latest.channel).toBe(NotificationChannel.EMAIL);
      expect((latest.payload as any).appointmentId).toBe(app.id);
      expect((latest.payload as any).serviceName).toBe('Limpieza Facial Profunda');
    });

    it('1.2. El endpoint de reserva retorna de inmediato sin esperar el despacho de red externo', async () => {
      const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);
      dayAfter.setHours(12, 0, 0, 0);

      const t0 = Date.now();
      const app = await appointmentsService.create(testBusiness.id, customerUser.id, {
        serviceId: testService.id,
        resourceId: testResource.id,
        branchId: testBranch.id,
        startTime: dayAfter.toISOString(),
      });
      const durationMs = Date.now() - t0;

      expect(app.id).toBeDefined();
      // Verificamos que la reserva se confirma en pocos milisegundos sin latencia de red externa
      expect(durationMs).toBeLessThan(1000);
    });
  });

  describe('2. Plantillas de Notificación (Criterio 2)', () => {
    it('2.1. Renderiza plantilla de Confirmación con detalles completos del negocio y turno', () => {
      const rendered = templatesService.render('APPOINTMENT_CONFIRMED', {
        businessName: 'Centro Dermatológico Láser',
        customerName: 'Camila Fernández',
        serviceName: 'Limpieza Facial Profunda',
        startTime: '2026-10-20T14:00:00.000Z',
        branchName: 'Sede Central',
        resourceName: 'Dra. Florencia',
        price: 22000,
        currency: 'ARS',
      });

      expect(rendered.subject).toContain('confirmado');
      expect(rendered.html).toContain('Centro Dermatológico Láser');
      expect(rendered.html).toContain('Limpieza Facial Profunda');
      expect(rendered.html).toContain('Dra. Florencia');
      expect(rendered.text).toContain('Camila Fernández');
    });

    it('2.2. Renderiza plantilla de Cancelación con motivo expresado', () => {
      const rendered = templatesService.render('APPOINTMENT_CANCELLED', {
        businessName: 'Centro Dermatológico Láser',
        customerName: 'Camila Fernández',
        serviceName: 'Limpieza Facial Profunda',
        startTime: '2026-10-20T14:00:00.000Z',
        reason: 'Imprevisto personal',
      });

      expect(rendered.subject).toContain('cancelado');
      expect(rendered.html).toContain('Turno Cancelado');
      expect(rendered.html).toContain('Imprevisto personal');
    });

    it('2.3. Renderiza plantilla de Reprogramación con horario anterior y nuevo', () => {
      const rendered = templatesService.render('APPOINTMENT_RESCHEDULED', {
        businessName: 'Centro Dermatológico Láser',
        customerName: 'Camila Fernández',
        serviceName: 'Limpieza Facial Profunda',
        previousStartTime: '2026-10-20T14:00:00.000Z',
        startTime: '2026-10-22T16:00:00.000Z',
        branchName: 'Sede Central',
        resourceName: 'Dra. Florencia',
      });

      expect(rendered.subject).toContain('reprogramado');
      expect(rendered.html).toContain('Turno Reprogramado');
      expect(rendered.text).toContain('Nuevo horario');
    });

    it('2.4. Renderiza plantilla de Recordatorio (24h antes)', () => {
      const rendered = templatesService.render('APPOINTMENT_REMINDER', {
        businessName: 'Centro Dermatológico Láser',
        customerName: 'Camila Fernández',
        serviceName: 'Limpieza Facial Profunda',
        startTime: '2026-10-21T10:00:00.000Z',
        branchName: 'Sede Central',
        resourceName: 'Dra. Florencia',
      });

      expect(rendered.subject).toContain('Recordatorio');
      expect(rendered.html).toContain('Recordatorio de Turno');
    });
  });

  describe('3. Despacho, Reintentos y Resiliencia del Outbox (Criterio 3)', () => {
    it('3.1. Procesa lote de pendientes exitosamente y actualiza estado a SENT', async () => {
      const batchResult = await outboxProcessorService.processPending();

      expect(batchResult.totalProcessed).toBeGreaterThan(0);
      expect(batchResult.sentCount).toBeGreaterThan(0);

      const sentEmails = emailSenderService.getSentEmails();
      expect(sentEmails.length).toBeGreaterThan(0);
      expect(sentEmails[0].to).toBe(customerUser.email);
    });

    it('3.2. Idempotencia: una notificación en estado SENT no se duplica en ejecuciones posteriores', async () => {
      emailSenderService.clearSentEmails();

      // Correr de nuevo sin nuevas reservas pendientes
      const secondBatch = await outboxProcessorService.processPending();
      expect(secondBatch.totalProcessed).toBe(0);
      expect(emailSenderService.getSentEmails().length).toBe(0);
    });

    it('3.3. Falla de proveedor externo no revierte la reserva y pasa a RETRYING con backoff exponencial', async () => {
      // Activar simulación de falla en proveedor de correo
      emailSenderService.setSimulateFailure(true, 'SMTP connection timeout');

      // Crear nueva reserva
      const targetTime = new Date(Date.now() + 72 * 60 * 60 * 1000);
      targetTime.setHours(15, 0, 0, 0);

      const app = await appointmentsService.create(testBusiness.id, customerUser.id, {
        serviceId: testService.id,
        resourceId: testResource.id,
        branchId: testBranch.id,
        startTime: targetTime.toISOString(),
      });

      // La reserva existe y persiste perfectamente
      expect(app.id).toBeDefined();

      const notifRepo = dataSource.getRepository(NotificationEntity);
      const notif = await notifRepo.findOne({
        where: { businessId: testBusiness.id, status: NotificationStatus.PENDING },
        order: { createdAt: 'DESC' },
      });
      expect(notif).toBeDefined();

      // Ejecutar outbox con falla simulada
      const outcome = await outboxProcessorService.dispatchNotification(notif!);

      expect(outcome).toBe(NotificationStatus.RETRYING);

      const updatedNotif = await notifRepo.findOne({ where: { id: notif!.id } });
      expect(updatedNotif?.status).toBe(NotificationStatus.RETRYING);
      expect(updatedNotif?.retryCount).toBe(1);
      expect(updatedNotif?.lastError).toContain('SMTP connection timeout');
      // Debe haber programado scheduledAt a futuro con backoff
      expect(new Date(updatedNotif!.scheduledAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('3.4. Al superar el límite de reintentos máximos, marca la notificación como FAILED', async () => {
      emailSenderService.setSimulateFailure(true, 'SMTP persistent fatal error');

      const notifRepo = dataSource.getRepository(NotificationEntity);
      const testNotif = await notifRepo.save(
        notifRepo.create({
          businessId: testBusiness.id,
          recipientEmail: 'falla@test.com',
          eventType: 'APPOINTMENT_CONFIRMED',
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.RETRYING,
          retryCount: 2, // Ya lleva 2 intentos
          payload: { businessName: 'Test' },
          scheduledAt: new Date(),
        }),
      );

      // Ejecutar 3er intento (alcanza maxRetries = 3)
      const outcome = await outboxProcessorService.dispatchNotification(testNotif);

      expect(outcome).toBe(NotificationStatus.FAILED);

      const failedNotif = await notifRepo.findOne({ where: { id: testNotif.id } });
      expect(failedNotif?.status).toBe(NotificationStatus.FAILED);
      expect(failedNotif?.retryCount).toBe(3);
      expect(failedNotif?.lastError).toContain('Máximo de reintentos alcanzado');
    });

    it('3.5. Reintento manual resetea contador y ejecuta despacho inmediatamente', async () => {
      emailSenderService.setSimulateFailure(false); // Restaurar servicio

      const notifRepo = dataSource.getRepository(NotificationEntity);
      const failed = await notifRepo.findOne({ where: { status: NotificationStatus.FAILED } });
      expect(failed).toBeDefined();

      const retried = await outboxProcessorService.retrySingle(failed!.id);
      expect(retried.status).toBe(NotificationStatus.SENT);
      expect(retried.retryCount).toBe(0);
    });
  });

  describe('4. Automatizaciones y Webhooks n8n (Criterios 4 y 5)', () => {
    it('4.1. Despacha evento por canal N8N_WEBHOOK con firma HMAC SHA-256 válida', async () => {
      const notifRepo = dataSource.getRepository(NotificationEntity);

      const webhookNotif = await notifRepo.save(
        notifRepo.create({
          businessId: testBusiness.id,
          recipientEmail: 'webhook-subscriber@n8n.local',
          eventType: 'APPOINTMENT_CONFIRMED',
          channel: NotificationChannel.N8N_WEBHOOK,
          status: NotificationStatus.PENDING,
          payload: {
            webhookUrl: 'mock://n8n-instance.test/webhook/voko-reservas',
            appointmentId: 'mock-app-123',
            customerName: 'Camila',
          },
          scheduledAt: new Date(),
        }),
      );

      const outcome = await outboxProcessorService.dispatchNotification(webhookNotif);
      expect(outcome).toBe(NotificationStatus.SENT);

      const latestWebhook = n8nSenderService.getLatestWebhook();
      expect(latestWebhook).toBeDefined();
      expect(latestWebhook?.eventType).toBe('APPOINTMENT_CONFIRMED');
      expect(latestWebhook?.headers['X-Voko-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(latestWebhook?.headers['X-Voko-Delivery-Id']).toBe(webhookNotif.id);
    });

    it('4.2. El sistema opera normalmente sin n8n (Criterio 5)', async () => {
      // Simular que n8n se cae
      n8nSenderService.setSimulateFailure(true, 'n8n host unreachable');

      const notifRepo = dataSource.getRepository(NotificationEntity);
      const webhookNotif = await notifRepo.save(
        notifRepo.create({
          businessId: testBusiness.id,
          recipientEmail: 'webhook@n8n.local',
          eventType: 'APPOINTMENT_CONFIRMED',
          channel: NotificationChannel.N8N_WEBHOOK,
          status: NotificationStatus.PENDING,
          payload: { webhookUrl: 'mock://down.n8n.test' },
          scheduledAt: new Date(),
        }),
      );

      // Despacho de webhook falla y pasa a RETRYING
      const webhookOutcome = await outboxProcessorService.dispatchNotification(webhookNotif);
      expect(webhookOutcome).toBe(NotificationStatus.RETRYING);

      // Los emails estándar y el sistema continúan funcionando al 100% de manera independiente
      emailSenderService.setSimulateFailure(false);
      const emailNotif = await notifRepo.save(
        notifRepo.create({
          businessId: testBusiness.id,
          recipientEmail: 'cliente.normal@test.com',
          eventType: 'APPOINTMENT_CONFIRMED',
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
          payload: { businessName: 'Test' },
          scheduledAt: new Date(),
        }),
      );

      const emailOutcome = await outboxProcessorService.dispatchNotification(emailNotif);
      expect(emailOutcome).toBe(NotificationStatus.SENT);
    });
  });

  describe('5. Gestión Operativa de Notificaciones y Recordatorios', () => {
    it('5.1. Consulta métricas consolidadas del Outbox del negocio', async () => {
      const stats = await notificationsService.getStats(testBusiness.id);

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.sent).toBeGreaterThan(0);
      expect(stats.byChannel.email).toBeGreaterThan(0);
      expect(stats.deliverySuccessRate).toBeGreaterThanOrEqual(0);
    });

    it('5.2. Genera recordatorios para citas en las próximas 24 horas evitando duplicaciones', async () => {
      // Crear una cita programada para dentro de 24 horas
      const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await appointmentsService.create(testBusiness.id, customerUser.id, {
        serviceId: testService.id,
        resourceId: testResource.id,
        branchId: testBranch.id,
        startTime: in24h.toISOString(),
      });

      // Ejecutar generador de recordatorios
      const res1 = await notificationsService.generate24hReminders(testBusiness.id);
      expect(res1.remindersCreated).toBeGreaterThanOrEqual(1);

      // Ejecutar una segunda vez inmediatamente: no debe crear duplicados
      const res2 = await notificationsService.generate24hReminders(testBusiness.id);
      expect(res2.remindersCreated).toBe(0);
    });
  });
});
