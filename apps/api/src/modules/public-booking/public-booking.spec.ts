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
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { SessionsService } from '../sessions/sessions.service';
import { PublicBookingService } from './public-booking.service';

import {
  BookingMode,
  ConfirmationMode,
  ResourceType,
  AppointmentStatus,
  SessionStatus,
  BusinessStatus,
} from '@voko/shared';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('Hito 6: Interfaz Pública y Autoservicio de Reserva (PublicBookingService)', () => {
  let dataSource: DataSource;
  let businessesService: BusinessesService;
  let servicesService: ServicesService;
  let resourcesService: ResourcesService;
  let availabilityService: AvailabilityService;
  let appointmentsService: AppointmentsService;
  let sessionsService: SessionsService;
  let publicBookingService: PublicBookingService;

  let ownerUser: UserEntity;
  let barberBusiness: BusinessEntity;
  let haircutService: ServiceEntity;
  let barberResource: ResourceEntity;
  let groupService: ServiceEntity;
  let spinningSession: SessionEntity;

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
    availabilityService = new AvailabilityService(dataSource);
    appointmentsService = new AppointmentsService(dataSource);
    sessionsService = new SessionsService(dataSource);
    publicBookingService = new PublicBookingService(
      dataSource,
      availabilityService,
      appointmentsService,
      sessionsService,
    );

    // 1. Dueño de negocio
    const userRepo = dataSource.getRepository(UserEntity);
    ownerUser = await userRepo.save(
      userRepo.create({
        firstName: 'Esteban',
        lastName: 'Barbero',
        email: 'esteban.barbero@voko.test',
        passwordHash: await argon2.hash('Secret123!'),
        isActive: true,
      }),
    );

    // 2. Negocio barbería
    barberBusiness = await businessesService.create(ownerUser.id, {
      name: 'Voko Barber Club',
      slug: 'voko-barber',
      description: 'Barbería de autor y cuidado masculino',
      contactEmail: 'turnos@vokobarber.test',
      phone: '+54 11 9999-8888',
      primaryColor: '#0F172A',
      secondaryColor: '#38BDF8',
    });

    const branchRepo = dataSource.getRepository(BranchEntity);
    const branches = await branchRepo.find({ where: { businessId: barberBusiness.id } });
    const defaultBranch = branches[0];

    // 3. Servicios
    haircutService = await servicesService.create(barberBusiness.id, {
      name: 'Corte de Cabello Clásico',
      description: 'Lavado, corte a tijera o máquina y peinado con cera mate',
      durationMinutes: 30,
      price: 12000,
      currency: 'ARS',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 5,
      minBookingNoticeMinutes: 0,
      maxBookingAdvanceDays: 30,
      bookingMode: BookingMode.INDIVIDUAL,
      confirmationMode: ConfirmationMode.AUTOMATIC,
    });

    groupService = await servicesService.create(barberBusiness.id, {
      name: 'Masterclass de Afeitado Tradicional',
      description: 'Taller grupal intensivo con navaja y toalla caliente',
      durationMinutes: 60,
      price: 25000,
      currency: 'ARS',
      bookingMode: BookingMode.GROUP_SESSION,
      confirmationMode: ConfirmationMode.AUTOMATIC,
    });

    // 4. Recursos
    barberResource = await resourcesService.create(barberBusiness.id, {
      branchId: defaultBranch.id,
      name: 'Facundo Maestro Barbero',
      resourceType: ResourceType.STAFF,
      serviceIds: [haircutService.id],
      isActive: true,
    });

    // Regla de horario habitual para los Lunes (day 1) de 09:00 a 18:00
    await availabilityService.createRule(barberBusiness.id, {
      resourceId: barberResource.id,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '18:00',
      isActive: true,
    });

    // 5. Sesión grupal
    spinningSession = await sessionsService.createSession(barberBusiness.id, {
      serviceId: groupService.id,
      branchId: defaultBranch.id,
      resourceId: barberResource.id,
      startTime: '2026-11-09T18:00:00.000Z',
      endTime: '2026-11-09T19:00:00.000Z',
      maxCapacity: 4,
    });
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('6.1. Debe obtener la ficha pública del negocio con catálogo y configuración de marca', async () => {
    const publicData = await publicBookingService.getPublicBusiness('voko-barber');

    expect(publicData.business.name).toBe('Voko Barber Club');
    expect(publicData.business.slug).toBe('voko-barber');
    expect(publicData.settings.brandPrimaryColor).toBe('#0F172A');
    expect(publicData.settings.allowPublicBooking).toBe(true);

    expect(publicData.services.length).toBeGreaterThanOrEqual(1);
    const foundService = publicData.services.find((s) => s.id === haircutService.id);
    expect(foundService).toBeDefined();
    expect(foundService?.resources.length).toBe(1);
    expect(foundService?.resources[0].name).toBe('Facundo Maestro Barbero');

    expect(publicData.upcomingSessions.length).toBe(1);
    expect(publicData.upcomingSessions[0].remainingSpots).toBe(4);
  });

  it('6.2. Debe rechazar la consulta de un negocio inexistente con NotFoundException', async () => {
    await expect(
      publicBookingService.getPublicBusiness('slug-inexistente-123'),
    ).rejects.toThrow(NotFoundException);
  });

  it('6.3. Debe consultar slots públicos disponibles para una fecha específica', async () => {
    // 2026-11-09 es un Lunes
    const slots = await publicBookingService.getPublicSlots('voko-barber', {
      serviceId: haircutService.id,
      date: '2026-11-09',
      resourceId: barberResource.id,
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].available).toBe(true);
    expect(slots[0].resourceId).toBe(barberResource.id);
  });

  it('6.4. Debe realizar una reserva pública exitosa y retornar código de confirmación VK-XXXX', async () => {
    const startTime = '2026-11-09T10:00:00.000Z';

    const booking = await publicBookingService.bookAppointment('voko-barber', {
      serviceId: haircutService.id,
      resourceId: barberResource.id,
      startTime,
      customer: {
        firstName: 'Gonzalo',
        lastName: 'Cliente',
        email: 'gonzalo.cliente@publico.test',
        phone: '+54 11 8888 7777',
        notes: 'Puntualidad por favor',
      },
    });

    expect(booking.appointmentId).toBeDefined();
    expect(booking.confirmationCode).toMatch(/^VK-[A-Z0-9]{8}$/);
    expect(booking.status).toBe(AppointmentStatus.CONFIRMED);
    expect(booking.serviceName).toBe('Corte de Cabello Clásico');
    expect(booking.price).toBe(12000);
    expect(booking.customer.email).toBe('gonzalo.cliente@publico.test');

    // Comprobar que el slot ya no se ofrece
    const updatedSlots = await publicBookingService.getPublicSlots('voko-barber', {
      serviceId: haircutService.id,
      date: '2026-11-09',
      resourceId: barberResource.id,
    });

    const bookedSlot = updatedSlots.find((s) => s.startTime === startTime);
    expect(bookedSlot).toBeUndefined();
  });

  it('6.5. Debe permitir la inscripción pública a una clase grupal con cupos', async () => {
    const joinResult = await publicBookingService.joinSession(
      'voko-barber',
      spinningSession.id,
      {
        customer: {
          firstName: 'Mateo',
          lastName: 'Participante',
          email: 'mateo.taller@publico.test',
          phone: '+54 11 4444 3333',
        },
      },
    );

    expect(joinResult.confirmationCode).toMatch(/^VK-[A-Z0-9]{8}$/);
    expect(joinResult.currentAttendees).toBe(1);
    expect(joinResult.maxCapacity).toBe(4);
    expect(joinResult.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it('6.6. Debe rechazar reservas si el negocio tiene allowPublicBooking = false', async () => {
    // Deshabilitar reservas públicas en settings
    const settingsRepo = dataSource.getRepository(BusinessSettingsEntity);
    await settingsRepo.update(
      { businessId: barberBusiness.id },
      { allowPublicBooking: false },
    );

    await expect(
      publicBookingService.bookAppointment('voko-barber', {
        serviceId: haircutService.id,
        startTime: '2026-11-09T14:00:00.000Z',
        customer: {
          firstName: 'Ana',
          lastName: 'Intento',
          email: 'ana@test.com',
          phone: '12345678',
        },
      }),
    ).rejects.toThrow(ForbiddenException);

    // Restaurar
    await settingsRepo.update(
      { businessId: barberBusiness.id },
      { allowPublicBooking: true },
    );
  });
});
