import { DataSource } from 'typeorm';
import {
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
} from '../../database/entities';

import { SuperadminService } from './superadmin.service';
import { SuperadminGuard } from '../../common/guards/superadmin.guard';
import { PublicBookingService } from '../public-booking/public-booking.service';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { SessionsService } from '../sessions/sessions.service';

import {
  BusinessStatus,
  UserRole,
  MembershipStatus,
  BookingMode,
  AppointmentStatus,
} from '@voko/shared';
import * as argon2 from 'argon2';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Hito 8: Panel Superadmin, Operación Global y Seguridad', () => {
  let dataSource: DataSource;
  let superadminService: SuperadminService;
  let publicBookingService: PublicBookingService;
  let superadminGuard: SuperadminGuard;

  let superadminUser: UserEntity;
  let regularAdminUser: UserEntity;
  let testBusiness: BusinessEntity;
  let testService: ServiceEntity;
  let testBranch: BranchEntity;

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

    superadminService = new SuperadminService(dataSource);
    superadminGuard = new SuperadminGuard();

    const availabilityService = new AvailabilityService(dataSource);
    const appointmentsService = new AppointmentsService(dataSource);
    const sessionsService = new SessionsService(dataSource);
    publicBookingService = new PublicBookingService(
      dataSource,
      availabilityService,
      appointmentsService,
      sessionsService,
    );

    const userRepo = dataSource.getRepository(UserEntity);
    const businessRepo = dataSource.getRepository(BusinessEntity);
    const branchRepo = dataSource.getRepository(BranchEntity);
    const settingsRepo = dataSource.getRepository(BusinessSettingsEntity);
    const membershipRepo = dataSource.getRepository(BusinessMembershipEntity);
    const serviceRepo = dataSource.getRepository(ServiceEntity);

    const passwordHash = await argon2.hash('TestPassword123!');

    // 1. Superadmin User
    superadminUser = await userRepo.save(
      userRepo.create({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@voko.test',
        passwordHash,
        isActive: true,
        isSuperadmin: true,
      }),
    );

    // 2. Regular Business Admin (NO superadmin)
    regularAdminUser = await userRepo.save(
      userRepo.create({
        firstName: 'Dueño',
        lastName: 'Común',
        email: 'dueno@negocio.test',
        passwordHash,
        isActive: true,
        isSuperadmin: false,
      }),
    );

    // 3. Negocio de prueba
    testBusiness = await businessRepo.save(
      businessRepo.create({
        name: 'Clínica Integral del Norte',
        slug: 'clinica-integral-norte',
        industry: 'Salud',
        contactEmail: 'contacto@clinicanorte.test',
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        status: BusinessStatus.ACTIVE,
      }),
    );

    await settingsRepo.save(
      settingsRepo.create({
        businessId: testBusiness.id,
        allowPublicBooking: true,
        defaultSlotIntervalMinutes: 30,
      }),
    );

    testBranch = await branchRepo.save(
      branchRepo.create({
        businessId: testBusiness.id,
        name: 'Sede Central',
        address: 'Av. Libertador 4500',
        isDefault: true,
        isActive: true,
      }),
    );

    await membershipRepo.save(
      membershipRepo.create({
        businessId: testBusiness.id,
        userId: regularAdminUser.id,
        role: UserRole.OWNER,
        status: MembershipStatus.ACTIVE,
      }),
    );

    testService = await serviceRepo.save(
      serviceRepo.create({
        businessId: testBusiness.id,
        name: 'Consulta Cardiológica',
        durationMinutes: 45,
        price: 15000,
        currency: 'ARS',
        bookingMode: BookingMode.INDIVIDUAL,
        isActive: true,
      }),
    );
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('1. Control de Acceso Global (SuperadminGuard)', () => {
    it('debe rechazar con 403 Forbidden a un usuario común o administrador sin isSuperadmin', () => {
      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: regularAdminUser.id, email: regularAdminUser.email, isSuperadmin: false },
          }),
        }),
      } as any;

      expect(() => superadminGuard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    });

    it('debe permitir el acceso si el usuario autenticado tiene isSuperadmin: true', () => {
      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: superadminUser.id, email: superadminUser.email, isSuperadmin: true },
          }),
        }),
      } as any;

      const result = superadminGuard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });
  });

  describe('2. Gestión y Listado de Negocios de la Plataforma', () => {
    it('debe listar todos los negocios con sus métricas agregadas', async () => {
      const businesses = await superadminService.listBusinesses();
      expect(businesses.length).toBeGreaterThanOrEqual(1);

      const target = businesses.find((b) => b.id === testBusiness.id);
      expect(target).toBeDefined();
      expect(target?.name).toBe('Clínica Integral del Norte');
      expect(target?.industry).toBe('Salud');
      expect(target?.metrics.branchesCount).toBe(1);
      expect(target?.metrics.servicesCount).toBe(1);
      expect(target?.owner?.email).toBe(regularAdminUser.email);
    });

    it('debe filtrar negocios por estado y término de búsqueda', async () => {
      const filtered = await superadminService.listBusinesses({
        search: 'norte',
        status: BusinessStatus.ACTIVE,
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].slug).toBe('clinica-integral-norte');

      const nonExistent = await superadminService.listBusinesses({ search: 'inexistente_xyz' });
      expect(nonExistent.length).toBe(0);
    });

    it('debe devolver la ficha técnica detallada para soporte', async () => {
      const details = await superadminService.getBusinessDetails(testBusiness.id);
      expect(details.business.id).toBe(testBusiness.id);
      expect(details.branches.length).toBe(1);
      expect(details.services.length).toBe(1);
      expect(details.members.length).toBe(1);
      expect(details.stats.totalAppointments).toBe(0);
    });
  });

  describe('3. Creación Express de Negocio desde Superadmin', () => {
    it('debe permitir al superadmin registrar un nuevo negocio con propietario inicial', async () => {
      const result = await superadminService.createBusiness(
        {
          name: 'Estudio de Yoga Serenity',
          slug: 'yoga-serenity',
          industry: 'Bienestar',
          contactEmail: 'info@yogaserenity.test',
          ownerEmail: 'profesora@yogaserenity.test',
          ownerFirstName: 'Sofía',
          ownerLastName: 'Albarracín',
          initialPassword: 'PasswordYoga123!',
        },
        superadminUser.id,
      );

      expect(result.business.id).toBeDefined();
      expect(result.business.status).toBe(BusinessStatus.ACTIVE);
      expect(result.owner.email).toBe('profesora@yogaserenity.test');
      expect(result.owner.role).toBe(UserRole.OWNER);

      // Comprobar registro en auditoría global
      const auditRepo = dataSource.getRepository(AuditLogEntity);
      const auditLog = await auditRepo.findOne({
        where: { action: 'BUSINESS_CREATED_BY_SUPERADMIN', entityId: result.business.id },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.actorUserId).toBe(superadminUser.id);
    });

    it('debe rechazar la creación si el slug ya existe', async () => {
      await expect(
        superadminService.createBusiness(
          {
            name: 'Otro Yoga',
            slug: 'yoga-serenity',
            contactEmail: 'otro@yoga.test',
            ownerEmail: 'otro@yoga.test',
            ownerFirstName: 'Otro',
            ownerLastName: 'Profe',
          },
          superadminUser.id,
        ),
      ).rejects.toThrow();
    });
  });

  describe('4. Suspensión y Reactivación con Preservación de Datos', () => {
    it('debe suspender un negocio, registrar el motivo y verificar que no se borran los datos', async () => {
      const res = await superadminService.updateBusinessStatus(
        testBusiness.id,
        {
          status: BusinessStatus.SUSPENDED,
          reason: 'Auditoría comercial preventiva por documentación incompleta',
        },
        superadminUser.id,
      );

      expect(res.status).toBe(BusinessStatus.SUSPENDED);
      expect(res.previousStatus).toBe(BusinessStatus.ACTIVE);

      // Verificar que los datos permanecen 100% intactos en la base de datos
      const branchRepo = dataSource.getRepository(BranchEntity);
      const serviceRepo = dataSource.getRepository(ServiceEntity);
      const membershipRepo = dataSource.getRepository(BusinessMembershipEntity);

      const branchesCount = await branchRepo.count({ where: { businessId: testBusiness.id } });
      const servicesCount = await serviceRepo.count({ where: { businessId: testBusiness.id } });
      const membersCount = await membershipRepo.count({ where: { businessId: testBusiness.id } });

      expect(branchesCount).toBe(1);
      expect(servicesCount).toBe(1);
      expect(membersCount).toBe(1);

      // Verificar auditoría
      const auditRepo = dataSource.getRepository(AuditLogEntity);
      const auditEntry = await auditRepo.findOne({
        where: { businessId: testBusiness.id, action: 'BUSINESS_SUSPENDED' },
      });
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.actorUserId).toBe(superadminUser.id);
      expect((auditEntry?.diffData as any)?.reason).toContain('preventiva');
    });

    it('las solicitudes públicas hacia un negocio suspendido deben ser bloqueadas', async () => {
      await expect(publicBookingService.getPublicBusiness('clinica-integral-norte')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe reactivar el negocio y restablecer el acceso público de inmediato', async () => {
      const res = await superadminService.updateBusinessStatus(
        testBusiness.id,
        {
          status: BusinessStatus.ACTIVE,
          reason: 'Documentación validada correctamente',
        },
        superadminUser.id,
      );

      expect(res.status).toBe(BusinessStatus.ACTIVE);

      // El acceso público vuelve a funcionar normalmente
      const publicData = await publicBookingService.getPublicBusiness('clinica-integral-norte');
      expect(publicData.business.name).toBe('Clínica Integral del Norte');
      expect(publicData.services.length).toBe(1);
    });
  });

  describe('5. Asignación de Administradores y Gestión de Usuarios', () => {
    it('debe permitir asignar un nuevo administrador a un negocio existente', async () => {
      const adminAssigned = await superadminService.assignAdmin(
        testBusiness.id,
        {
          email: 'coordinador.medico@clinicanorte.test',
          firstName: 'Dr. Fernando',
          lastName: 'Molina',
          role: UserRole.ADMIN,
        },
        superadminUser.id,
      );

      expect(adminAssigned.email).toBe('coordinador.medico@clinicanorte.test');
      expect(adminAssigned.role).toBe(UserRole.ADMIN);
      expect(adminAssigned.status).toBe(MembershipStatus.ACTIVE);
    });

    it('debe listar usuarios de la plataforma con sus membresías activas', async () => {
      const users = await superadminService.listUsers('coordinador.medico');
      expect(users.length).toBe(1);
      expect(users[0].activeMembershipsCount).toBe(1);
      expect(users[0].isSuperadmin).toBe(false);
    });

    it('debe permitir conceder y revocar rol de superadmin', async () => {
      const users = await superadminService.listUsers('coordinador.medico');
      const targetUserId = users[0].id;

      // Conceder superadmin
      const granted = await superadminService.toggleUserSuperadmin(targetUserId, superadminUser.id);
      expect(granted.isSuperadmin).toBe(true);

      // Revocar superadmin
      const revoked = await superadminService.toggleUserSuperadmin(targetUserId, superadminUser.id);
      expect(revoked.isSuperadmin).toBe(false);
    });

    it('debe impedir que el único superadmin del sistema se revoque sus propios privilegios', async () => {
      await expect(
        superadminService.toggleUserSuperadmin(superadminUser.id, superadminUser.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('6. Métricas Agregadas y Pista de Auditoría de la Plataforma', () => {
    it('debe computar métricas globales agregadas sin exponer datos personales', async () => {
      const metrics = await superadminService.getGlobalMetrics();

      expect(metrics.overview.totalBusinesses).toBeGreaterThanOrEqual(2);
      expect(metrics.overview.activeBusinesses).toBeGreaterThanOrEqual(2);
      expect(metrics.overview.totalUsers).toBeGreaterThanOrEqual(3);
      expect(metrics.overview.totalSuperadmins).toBe(1);
      expect(metrics.appointmentsStatusBreakdown).toBeDefined();
      expect(metrics.industryBreakdown.length).toBeGreaterThanOrEqual(1);

      // Validar que no hay llaves que contengan PII sensible
      expect((metrics as any).customerNames).toBeUndefined();
      expect((metrics as any).passwords).toBeUndefined();
    });

    it('debe consultar los registros de auditoría global con sus actores', async () => {
      const auditLogs = await superadminService.getAuditLogs(10);
      expect(auditLogs.length).toBeGreaterThanOrEqual(3);

      const latestLog = auditLogs[0];
      expect(latestLog.id).toBeDefined();
      expect(latestLog.action).toBeDefined();
      expect(latestLog.actor?.email).toBe(superadminUser.email);
    });
  });
});
