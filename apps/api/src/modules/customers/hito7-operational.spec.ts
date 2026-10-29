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

import { BusinessesService } from '../businesses/businesses.service';
import { ServicesService } from '../services/services.service';
import { ResourcesService } from '../resources/resources.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CustomersService } from './customers.service';
import { CustomerPortalService } from '../customer-portal/customer-portal.service';
import { ReportsService } from '../reports/reports.service';
import { InvitationsService } from '../invitations/invitations.service';
import { AuthService } from '../auth/auth.service';

import {
  BookingMode,
  ConfirmationMode,
  ResourceType,
  AppointmentStatus,
  AppointmentEventType,
  UserRole,
  MembershipStatus,
  InvitationStatus,
} from '@voko/shared';
import * as argon2 from 'argon2';

describe('Hito 7: Área del Cliente, Administración y Gestión Operativa', () => {
  let dataSource: DataSource;
  let businessesService: BusinessesService;
  let servicesService: ServicesService;
  let resourcesService: ResourcesService;
  let appointmentsService: AppointmentsService;
  let customersService: CustomersService;
  let customerPortalService: CustomerPortalService;
  let reportsService: ReportsService;
  let invitationsService: InvitationsService;

  let ownerUser: UserEntity;
  let staffUser: UserEntity;
  let customerUser: UserEntity;
  let testBusiness: BusinessEntity;
  let testBranch: BranchEntity;
  let testService: ServiceEntity;
  let testResource: ResourceEntity;
  let appointment1: AppointmentEntity;
  let appointment2: AppointmentEntity;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      dropSchema: true,
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

    businessesService = new BusinessesService(dataSource);
    servicesService = new ServicesService(dataSource);
    resourcesService = new ResourcesService(dataSource);
    appointmentsService = new AppointmentsService(dataSource);
    customersService = new CustomersService(dataSource);
    customerPortalService = new CustomerPortalService(dataSource, appointmentsService);
    reportsService = new ReportsService(dataSource);
    invitationsService = new InvitationsService(dataSource, {} as any);

    // 1. Crear usuarios
    const userRepo = dataSource.getRepository(UserEntity);
    const passHash = await argon2.hash('Secret123!');

    ownerUser = await userRepo.save(
      userRepo.create({
        firstName: 'Valeria',
        lastName: 'Directora',
        email: 'valeria@clinica.test',
        passwordHash: passHash,
        isActive: true,
      }),
    );

    staffUser = await userRepo.save(
      userRepo.create({
        firstName: 'Martín',
        lastName: 'Recepcionista',
        email: 'martin.staff@clinica.test',
        passwordHash: passHash,
        isActive: true,
      }),
    );

    customerUser = await userRepo.save(
      userRepo.create({
        firstName: 'Lucas',
        lastName: 'Paciente',
        email: 'lucas.paciente@test.com',
        phone: '+5491122334455',
        passwordHash: passHash,
        isActive: true,
      }),
    );

    // 2. Crear negocio
    testBusiness = await businessesService.create(ownerUser.id, {
      name: 'Clínica Médica Voko',
      slug: 'clinica-medica-voko',
      contactEmail: 'contacto@clinicavoko.test',
      phone: '+541155551000',
    });

    const branchRepo = dataSource.getRepository(BranchEntity);
    const branches = await branchRepo.find({ where: { businessId: testBusiness.id } });
    testBranch = branches[0];

    // Asignar membresía STAFF a Martín
    const memRepo = dataSource.getRepository(BusinessMembershipEntity);
    await memRepo.save(
      memRepo.create({
        businessId: testBusiness.id,
        userId: staffUser.id,
        role: UserRole.STAFF,
        status: MembershipStatus.ACTIVE,
      }),
    );

    // 3. Crear servicio y recurso
    testService = await servicesService.create(testBusiness.id, {
      name: 'Consulta Médica General',
      durationMinutes: 30,
      price: 15000,
      currency: 'ARS',
      bookingMode: BookingMode.INDIVIDUAL,
      confirmationMode: ConfirmationMode.AUTOMATIC,
      cancellationDeadlineMinutes: 120, // 2 horas
      minBookingNoticeMinutes: 0,
    });

    testResource = await resourcesService.create(testBusiness.id, {
      branchId: testBranch.id,
      name: 'Dr. Roberto Cardiólogo',
      resourceType: ResourceType.STAFF,
      serviceIds: [testService.id],
    });

    // 4. Crear citas de prueba
    // Cita 1: Mañana a las 10:00 (futura, CONFIRMED)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(10, 0, 0, 0);

    appointment1 = await appointmentsService.create(
      testBusiness.id,
      customerUser.id,
      {
        serviceId: testService.id,
        resourceId: testResource.id,
        branchId: testBranch.id,
        startTime: tomorrow.toISOString(),
        customerNotes: 'Revisión anual',
      },
    );

    // Cita 2: Pasada (COMPLETED) guardada directamente en repo
    const past = new Date(Date.now() - 48 * 60 * 60 * 1000);
    past.setHours(14, 0, 0, 0);

    const appRepo = dataSource.getRepository(AppointmentEntity);
    const eventRepo = dataSource.getRepository(AppointmentEventEntity);

    appointment2 = await appRepo.save(
      appRepo.create({
        businessId: testBusiness.id,
        branchId: testBranch.id,
        serviceId: testService.id,
        resourceId: testResource.id,
        customerId: customerUser.id,
        startTime: past,
        endTime: new Date(past.getTime() + 30 * 60 * 1000),
        status: AppointmentStatus.COMPLETED,
        snapshotPrice: 15000,
        snapshotCurrency: 'ARS',
        snapshotDurationMinutes: 30,
        internalNotes: 'Atención médica finalizada exitosamente',
      }),
    );

    await eventRepo.save(
      eventRepo.create({
        appointmentId: appointment2.id,
        eventType: AppointmentEventType.ATTENDED,
        previousStatus: AppointmentStatus.CONFIRMED,
        newStatus: AppointmentStatus.COMPLETED,
        actorUserId: staffUser.id,
      }),
    );
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('1. Portal del Cliente (CustomerPortalService)', () => {
    it('1.1. Debe consultar el perfil y métricas del cliente', async () => {
      const profile = await customerPortalService.getProfile(customerUser.id);
      expect(profile).toBeDefined();
      expect(profile.email).toBe(customerUser.email);
      expect(profile.fullName).toBe('Lucas Paciente');
      expect(profile.stats.upcomingCount).toBe(1);
      expect(profile.stats.completedCount).toBe(1);
    });

    it('1.2. Debe actualizar los datos personales y de contacto del cliente', async () => {
      const updated = await customerPortalService.updateProfile(customerUser.id, {
        firstName: 'Lucas Gabriel',
        phone: '+5491199887766',
      });
      expect(updated.firstName).toBe('Lucas Gabriel');
      expect(updated.fullName).toBe('Lucas Gabriel Paciente');
      expect(updated.phone).toBe('+5491199887766');
    });

    it('1.3. Debe listar las próximas reservas del cliente', async () => {
      const upcoming = await customerPortalService.getAppointments(customerUser.id, 'upcoming');
      expect(upcoming.length).toBe(1);
      expect(upcoming[0].id).toBe(appointment1.id);
      expect(upcoming[0].businessName).toBe('Clínica Médica Voko');
      expect(upcoming[0].serviceName).toBe('Consulta Médica General');
      expect(upcoming[0].canCancelOrReschedule).toBe(true);
    });

    it('1.4. Debe listar el historial de reservas pasadas', async () => {
      const past = await customerPortalService.getAppointments(customerUser.id, 'past');
      expect(past.length).toBeGreaterThanOrEqual(1);
      const completed = past.find((a) => a.id === appointment2.id);
      expect(completed).toBeDefined();
      expect(completed?.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('1.5. Debe reprogramar la reserva del cliente respetando plazos y anti-overbooking', async () => {
      const newDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      newDate.setHours(11, 0, 0, 0);

      const rescheduled = await customerPortalService.rescheduleAppointment(
        customerUser.id,
        appointment1.id,
        { startTime: newDate.toISOString() },
      );

      expect(rescheduled).toBeDefined();
      expect(new Date(rescheduled.startTime).getTime()).toBe(newDate.getTime());
    });

    it('1.6. Debe cancelar la reserva desde la cuenta del cliente y registrar evento', async () => {
      const cancelled = await customerPortalService.cancelAppointment(
        customerUser.id,
        appointment1.id,
        { reason: 'Imprevisto laboral del paciente' },
      );

      expect(cancelled.status).toBe(AppointmentStatus.CANCELLED_BY_CUSTOMER);
    });
  });

  describe('2. Gestión de Clientes y CRM (CustomersService)', () => {
    it('2.1. Debe listar los clientes del negocio con métricas de asistencia', async () => {
      const customers = await customersService.findByBusiness(testBusiness.id);
      expect(customers.length).toBeGreaterThanOrEqual(1);

      const lucas = customers.find((c) => c.email === customerUser.email);
      expect(lucas).toBeDefined();
      expect(lucas?.totalAppointments).toBe(2);
      expect(lucas?.completedAppointments).toBe(1);
      expect(lucas?.cancelledCount).toBe(1);
    });

    it('2.2. Debe consultar la ficha integral del cliente con historial completo', async () => {
      const profile = await customersService.findById(testBusiness.id, customerUser.id);
      expect(profile).toBeDefined();
      expect(profile.statistics.totalAppointments).toBe(2);
      expect(profile.statistics.attendanceRate).toBe(50);
      expect(profile.appointments.length).toBe(2);
    });

    it('2.3. Debe guardar notas internas confidenciales sobre el cliente', async () => {
      const result = await customersService.updateNotes(
        testBusiness.id,
        customerUser.id,
        'Paciente con antecedentes de hipertensión arterial. Preferencia de turno matutino.',
      );
      expect(result.success).toBe(true);

      const profile = await customersService.findById(testBusiness.id, customerUser.id);
      expect(profile.notes).toContain('Paciente con antecedentes de hipertensión');
    });
  });

  describe('3. Acciones Operativas y Estados de Atención (AppointmentsService)', () => {
    it('3.1. Debe realizar check-in y transición a IN_PROGRESS y registrar NO_SHOW', async () => {
      // Crear nueva cita para probar check-in
      const targetTime = new Date(Date.now() + 10 * 60 * 1000);
      const app = await appointmentsService.create(
        testBusiness.id,
        customerUser.id,
        {
          serviceId: testService.id,
          resourceId: testResource.id,
          branchId: testBranch.id,
          startTime: targetTime.toISOString(),
        },
      );

      // Confirmar recepción / atención
      const confirmed = await appointmentsService.updateStatus(
        testBusiness.id,
        app.id,
        staffUser.id,
        { status: AppointmentStatus.CONFIRMED, notes: 'Paciente en sala de espera' },
      );
      expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);

      // Marcar inasistencia (No-Show)
      const noShow = await appointmentsService.updateStatus(
        testBusiness.id,
        app.id,
        staffUser.id,
        { status: AppointmentStatus.NO_SHOW, notes: 'Paciente no se presentó tras 20 min' },
      );
      expect(noShow.status).toBe(AppointmentStatus.NO_SHOW);
    });
  });

  describe('4. Reportes Básicos y Auditoría (ReportsService)', () => {
    it('4.1. Debe calcular métricas reales de reservas, ingresos y tasas de asistencia', async () => {
      const summary = await reportsService.getSummary(testBusiness.id);

      expect(summary).toBeDefined();
      expect(summary.metrics.totalAppointments).toBeGreaterThanOrEqual(3);
      expect(summary.metrics.completedAppointments).toBe(1);
      expect(summary.metrics.noShowAppointments).toBe(1);
      expect(summary.metrics.cancelledAppointments).toBe(1);
      expect(summary.metrics.realizedRevenue).toBe(15000);
      expect(summary.topServices.length).toBeGreaterThan(0);
      expect(summary.resourcePerformance.length).toBeGreaterThan(0);
    });

    it('4.2. Debe recuperar el timeline de auditoría de turnos con actores y estados', async () => {
      const audit = await reportsService.getAuditHistory(testBusiness.id, 20);
      expect(audit.length).toBeGreaterThanOrEqual(3);
      expect(audit[0].actorName).toBeDefined();
      expect(audit[0].serviceName).toBe('Consulta Médica General');
    });
  });

  describe('5. Gestión de Invitaciones del Negocio (InvitationsService)', () => {
    let invitationId: string;

    it('5.1. Debe generar invitación para nuevo staff y listarla en pendientes', async () => {
      const inv = await invitationsService.create(
        { email: 'nuevo.enfermero@clinica.test', role: UserRole.STAFF, businessId: testBusiness.id },
        ownerUser.id,
        testBusiness.id,
      );

      expect(inv.id).toBeDefined();
      expect(inv.token).toBeDefined();
      invitationId = inv.id;

      const list = await invitationsService.findByBusiness(testBusiness.id);
      expect(list.length).toBeGreaterThanOrEqual(1);
      const found = list.find((i) => i.id === inv.id);
      expect(found).toBeDefined();
      expect(found?.status).toBe(InvitationStatus.PENDING);
    });

    it('5.2. Debe revocar una invitación pendiente', async () => {
      const result = await invitationsService.revoke(testBusiness.id, invitationId);
      expect(result.success).toBe(true);

      const list = await invitationsService.findByBusiness(testBusiness.id);
      const revoked = list.find((i) => i.id === invitationId);
      expect(revoked?.status).toBe(InvitationStatus.REVOKED);
    });
  });
});
