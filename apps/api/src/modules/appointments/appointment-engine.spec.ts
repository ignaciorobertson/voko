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

import { BusinessesService } from '../businesses/businesses.service';
import { BranchesService } from '../branches/branches.service';
import { ServicesService } from '../services/services.service';
import { ResourcesService } from '../resources/resources.service';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentsService } from './appointments.service';
import { SessionsService } from '../sessions/sessions.service';

import {
  BookingMode,
  ConfirmationMode,
  ResourceType,
  AppointmentStatus,
  SessionStatus,
  AppointmentEventType,
  ExceptionType,
} from '@voko/shared';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('Hito 5: Motor de Disponibilidad, Reservas y Concurrencia (Appointments & Sessions Engine)', () => {
  let dataSource: DataSource;
  let businessesService: BusinessesService;
  let branchesService: BranchesService;
  let servicesService: ServicesService;
  let resourcesService: ResourcesService;
  let availabilityService: AvailabilityService;
  let appointmentsService: AppointmentsService;
  let sessionsService: SessionsService;

  let ownerUser: UserEntity;
  let customerA: UserEntity;
  let customerB: UserEntity;
  let customerC: UserEntity;
  let testBusiness: BusinessEntity;
  let testBranch: BranchEntity;

  let individualService: ServiceEntity; // Modalidad A
  let groupService: ServiceEntity; // Modalidad B
  let resourceService: ServiceEntity; // Modalidad C

  let staffResource: ResourceEntity;
  let roomResource: ResourceEntity;
  let courtResource: ResourceEntity;

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
        AuthSessionEntity,
        PasswordResetEntity,
        AuditLogEntity,
      ],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();

    businessesService = new BusinessesService(dataSource);
    branchesService = new BranchesService(dataSource);
    servicesService = new ServicesService(dataSource);
    resourcesService = new ResourcesService(dataSource);
    availabilityService = new AvailabilityService(dataSource);
    appointmentsService = new AppointmentsService(dataSource);
    sessionsService = new SessionsService(dataSource);

    // 1. Usuarios
    const userRepo = dataSource.getRepository(UserEntity);
    const pwdHash = await argon2.hash('Secret123!');

    ownerUser = await userRepo.save(
      userRepo.create({
        firstName: 'Laura',
        lastName: 'Directora',
        email: 'laura.owner@voko.test',
        passwordHash: pwdHash,
        isActive: true,
      }),
    );

    customerA = await userRepo.save(
      userRepo.create({
        firstName: 'Martín',
        lastName: 'Cliente 1',
        email: 'martin.c1@voko.test',
        passwordHash: pwdHash,
        isActive: true,
      }),
    );

    customerB = await userRepo.save(
      userRepo.create({
        firstName: 'Sofía',
        lastName: 'Cliente 2',
        email: 'sofia.c2@voko.test',
        passwordHash: pwdHash,
        isActive: true,
      }),
    );

    customerC = await userRepo.save(
      userRepo.create({
        firstName: 'Lucas',
        lastName: 'Cliente 3',
        email: 'lucas.c3@voko.test',
        passwordHash: pwdHash,
        isActive: true,
      }),
    );

    // 2. Negocio & Sucursal & Settings (mediante BusinessesService)
    testBusiness = await businessesService.create(ownerUser.id, {
      name: 'Voko Complex Deportivo & Salud',
      slug: 'voko-complex',
      contactEmail: 'contacto@vokocomplex.test',
      phone: '+54 11 4444-5555',
      primaryColor: '#2563EB',
    });

    const branches = await branchesService.findByBusiness(testBusiness.id);
    testBranch = branches[0];

    // 3. Servicios (3 Modalidades)
    // Modalidad A: Individual 1-on-1 (Sesión Kinesiología)
    individualService = await servicesService.create(testBusiness.id, {
      name: 'Sesión Kinesiología 1 a 1',
      description: 'Atención personalizada de fisioterapia y rehabilitación',
      durationMinutes: 30,
      price: 15000,
      currency: 'ARS',
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 10,
      minBookingNoticeMinutes: 0,
      maxBookingAdvanceDays: 60,
      cancellationDeadlineMinutes: 120, // 2 horas
      bookingMode: BookingMode.INDIVIDUAL,
      confirmationMode: ConfirmationMode.AUTOMATIC,
    });

    // Modalidad B: Sesión Grupal (Spinning)
    groupService = await servicesService.create(testBusiness.id, {
      name: 'Clase Spinning Power',
      description: 'Entrenamiento cardiovascular guiado por intervalos',
      durationMinutes: 45,
      price: 8000,
      currency: 'ARS',
      minBookingNoticeMinutes: 0,
      maxBookingAdvanceDays: 30,
      cancellationDeadlineMinutes: 60,
      bookingMode: BookingMode.GROUP_SESSION,
      confirmationMode: ConfirmationMode.AUTOMATIC,
    });

    // Modalidad C: Reserva de Recurso Físico (Cancha de Pádel)
    resourceService = await servicesService.create(testBusiness.id, {
      name: 'Alquiler Cancha Pádel Panorámica',
      description: 'Alquiler exclusivo de pista de pádel de césped sintético',
      durationMinutes: 60,
      price: 24000,
      currency: 'ARS',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minBookingNoticeMinutes: 0,
      maxBookingAdvanceDays: 14,
      cancellationDeadlineMinutes: 180, // 3 horas
      bookingMode: BookingMode.RESOURCE_ONLY,
      confirmationMode: ConfirmationMode.MANUAL_APPROVAL,
    });

    // 4. Recursos vinculados a sus respectivos servicios
    staffResource = await resourcesService.create(testBusiness.id, {
      branchId: testBranch.id,
      name: 'Dr. Alejandro Kinesiólogo',
      resourceType: ResourceType.STAFF,
      serviceIds: [individualService.id],
      isActive: true,
    });

    roomResource = await resourcesService.create(testBusiness.id, {
      branchId: testBranch.id,
      name: 'Sala Multiuso Spinning',
      resourceType: ResourceType.ROOM,
      serviceIds: [groupService.id],
      isActive: true,
    });

    courtResource = await resourcesService.create(testBusiness.id, {
      branchId: testBranch.id,
      name: 'Cancha de Pádel Panorámica #1',
      resourceType: ResourceType.COURT,
      serviceIds: [resourceService.id],
      isActive: true,
    });
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('1. Disponibilidad y Reglas de Horario (AvailabilityService)', () => {
    it('1.1. Debe soportar turnos partidos (Split Shifts) y generar slots únicamente dentro de las ventanas activas', async () => {
      // Configuramos Lunes (dayOfWeek = 1):
      // Mañana: 09:00 a 13:00
      // Tarde: 16:00 a 20:00
      // La siesta (13:00 a 16:00) debe permanecer cerrada sin slots.
      await availabilityService.createRule(testBusiness.id, {
        resourceId: staffResource.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '13:00',
        isActive: true,
      });

      await availabilityService.createRule(testBusiness.id, {
        resourceId: staffResource.id,
        dayOfWeek: 1,
        startTime: '16:00',
        endTime: '20:00',
        isActive: true,
      });

      // Consultar disponibilidad para un Lunes futuro (2026-11-02 es un Lunes)
      const slots = await availabilityService.getAvailableSlots(testBusiness.id, {
        serviceId: individualService.id,
        resourceId: staffResource.id,
        date: '2026-11-02',
      });

      expect(slots.length).toBeGreaterThan(0);

      // Verificar que todos los slots están dentro de [09:00, 13:00] o [16:00, 20:00]
      for (const slot of slots) {
        const d = new Date(slot.startTime);
        const hours = d.getUTCHours();
        const isInMorning = hours >= 9 && hours < 13;
        const isInAfternoon = hours >= 16 && hours < 20;

        expect(isInMorning || isInAfternoon).toBe(true);
        // Garantizar que NO hay slots en el intervalo del corte (13:00 - 16:00)
        expect(hours >= 13 && hours < 16).toBe(false);
      }
    });

    it('1.2. Debe respetar excepciones bloqueantes (Feriados / Bloqueos de agenda)', async () => {
      // Bloquear la tarde del Lunes 2026-11-02 de 16:00 a 20:00
      await availabilityService.createException(testBusiness.id, {
        resourceId: staffResource.id,
        startTime: '2026-11-02T16:00:00.000Z',
        endTime: '2026-11-02T20:00:00.000Z',
        isBlocking: true,
        reason: 'Capacitación profesional del Dr. Alejandro',
        exceptionType: ExceptionType.BLOCK,
      });

      const slots = await availabilityService.getAvailableSlots(testBusiness.id, {
        serviceId: individualService.id,
        resourceId: staffResource.id,
        date: '2026-11-02',
      });

      // Ahora solo deben existir slots en la franja matutina (09:00 a 13:00)
      for (const slot of slots) {
        const d = new Date(slot.startTime);
        const hours = d.getUTCHours();
        expect(hours >= 9 && hours < 13).toBe(true);
        expect(hours >= 16).toBe(false);
      }
    });

    it('1.3. Debe admitir aperturas extraordinarias fuera de los días habituales', async () => {
      // Supongamos un Domingo (2026-11-08) donde habitualmente el negocio no atiende.
      // Creamos una apertura extraordinaria de 10:00 a 14:00
      await availabilityService.createException(testBusiness.id, {
        resourceId: staffResource.id,
        startTime: '2026-11-08T10:00:00.000Z',
        endTime: '2026-11-08T14:00:00.000Z',
        isBlocking: false,
        reason: 'Guardia especial de kinesiología deportiva',
        exceptionType: ExceptionType.EXTRAORDINARY_OPENING,
      });

      const sundaySlots = await availabilityService.getAvailableSlots(testBusiness.id, {
        serviceId: individualService.id,
        resourceId: staffResource.id,
        date: '2026-11-08',
      });

      expect(sundaySlots.length).toBeGreaterThan(0);
      for (const slot of sundaySlots) {
        const d = new Date(slot.startTime);
        const hours = d.getUTCHours();
        expect(hours >= 10 && hours < 14).toBe(true);
      }
    });

    it('1.4. Debe excluir slots que colisionen con citas activas existentes', async () => {
      // Agendamos una cita directa para el 2026-11-02 a las 10:00:00Z
      const appRepo = dataSource.getRepository(AppointmentEntity);
      await appRepo.save(
        appRepo.create({
          businessId: testBusiness.id,
          branchId: testBranch.id,
          serviceId: individualService.id,
          resourceId: staffResource.id,
          customerId: customerA.id,
          startTime: new Date('2026-11-02T10:00:00.000Z'),
          endTime: new Date('2026-11-02T10:30:00.000Z'),
          status: AppointmentStatus.CONFIRMED,
          snapshotPrice: 15000,
          snapshotDurationMinutes: 30,
          snapshotCurrency: 'ARS',
        }),
      );

      const slots = await availabilityService.getAvailableSlots(testBusiness.id, {
        serviceId: individualService.id,
        resourceId: staffResource.id,
        date: '2026-11-02',
      });

      const slot1000 = slots.find((s) => s.startTime === '2026-11-02T10:00:00.000Z');
      expect(slot1000).toBeUndefined(); // El slot de las 10:00 ya no debe ofrecerse
    });
  });

  describe('2. Motor de Reservas y Transaccionalidad Anti-Overbooking (AppointmentsService)', () => {
    it('2.1. Debe crear un turno individual con snapshot de precio, duración y evento de auditoría', async () => {
      // 2026-11-02 a las 11:00 UTC
      const startTime = '2026-11-02T11:00:00.000Z';

      const appointment = await appointmentsService.create(testBusiness.id, customerA.id, {
        serviceId: individualService.id,
        resourceId: staffResource.id,
        startTime,
        customerNotes: 'Dolor en rodilla derecha',
      });

      expect(appointment.id).toBeDefined();
      expect(appointment.status).toBe(AppointmentStatus.CONFIRMED);
      expect(appointment.snapshotPrice).toBe(15000);
      expect(appointment.snapshotDurationMinutes).toBe(30);
      expect(appointment.snapshotCurrency).toBe('ARS');

      // Validar evento de auditoría
      const eventRepo = dataSource.getRepository(AppointmentEventEntity);
      const events = await eventRepo.find({ where: { appointmentId: appointment.id } });
      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe(AppointmentEventType.CREATED);
      expect(events[0].newStatus).toBe(AppointmentStatus.CONFIRMED);
      expect(events[0].actorUserId).toBe(customerA.id);
    });

    it('2.2. Modalidad C: Debe registrar la reserva en estado PENDING cuando requiere aprobación manual', async () => {
      // Usar fecha dentro de los 14 días permitidos (ej. 7 días en el futuro)
      const targetDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      targetDate.setUTCHours(18, 0, 0, 0);
      const startTime = targetDate.toISOString();

      const padelAppointment = await appointmentsService.create(testBusiness.id, customerB.id, {
        serviceId: resourceService.id,
        resourceId: courtResource.id,
        startTime,
      });

      expect(padelAppointment.id).toBeDefined();
      expect(padelAppointment.status).toBe(AppointmentStatus.PENDING);
      expect(padelAppointment.snapshotPrice).toBe(24000);
      expect(padelAppointment.snapshotDurationMinutes).toBe(60);
    });

    it('2.3. PREVENCIÓN DE DOBLE RESERVA Y CONFLICTOS: Cero sobre-reserva en mismo slot y solapamiento de buffers', async () => {
      // Escenario crítico de anti-overbooking:
      // Usamos el siguiente Lunes (2026-11-09) a las 10:00 UTC (horario habitual abierto sin bloqueos)
      const raceStartTime = '2026-11-09T10:00:00.000Z';

      // 1. Cliente A reserva exitosamente el slot de las 10:00 UTC
      const firstApp = await appointmentsService.create(testBusiness.id, customerA.id, {
        serviceId: individualService.id,
        resourceId: staffResource.id,
        startTime: raceStartTime,
      });

      expect(firstApp.id).toBeDefined();
      expect(firstApp.status).toBe(AppointmentStatus.CONFIRMED);

      // 2. Cliente B intenta reservar exactamente el mismo slot -> Debe ser rechazado con 409 Conflict
      await expect(
        appointmentsService.create(testBusiness.id, customerB.id, {
          serviceId: individualService.id,
          resourceId: staffResource.id,
          startTime: raceStartTime,
        }),
      ).rejects.toThrow(ConflictException);

      // 3. Cliente C intenta reservar con solapamiento dentro de la ventana de buffer (10:15 UTC, dentro de los 30 min) -> Rechazado con 409 Conflict
      const overlappingTime = '2026-11-09T10:15:00.000Z';
      await expect(
        appointmentsService.create(testBusiness.id, customerC.id, {
          serviceId: individualService.id,
          resourceId: staffResource.id,
          startTime: overlappingTime,
        }),
      ).rejects.toThrow(ConflictException);

      // 4. Verificar en base de datos que existe exactamente UN turno activo para este intervalo
      const appRepo = dataSource.getRepository(AppointmentEntity);
      const createdApps = await appRepo.find({
        where: {
          businessId: testBusiness.id,
          resourceId: staffResource.id,
          startTime: new Date(raceStartTime),
        },
      });
      expect(createdApps.length).toBe(1);
    });

    it('2.4. Debe reprogramar (reschedule) atómicamente y revertir sin alterar el turno si hay conflicto', async () => {
      // Creamos un turno para Customer C a las 12:00
      const appointmentC = await appointmentsService.create(testBusiness.id, customerC.id, {
        serviceId: individualService.id,
        resourceId: staffResource.id,
        startTime: '2026-11-02T12:00:00.000Z',
      });

      // Intentamos reprogramarlo a las 11:00 (que ya está ocupado por Customer A en el test 2.1)
      await expect(
        appointmentsService.reschedule(testBusiness.id, appointmentC.id, customerC.id, {
          newStartTime: '2026-11-02T11:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);

      // Verificamos que el turno original de C permanece INTACTO a las 12:00
      const appRepo = dataSource.getRepository(AppointmentEntity);
      const reloadedC = await appRepo.findOneOrFail({ where: { id: appointmentC.id } });
      expect(new Date(reloadedC.startTime).toISOString()).toBe('2026-11-02T12:00:00.000Z');

      // Ahora reprogramamos a un horario libre: 2026-11-02T12:30:00.000Z
      const rescheduledC = await appointmentsService.reschedule(
        testBusiness.id,
        appointmentC.id,
        customerC.id,
        {
          newStartTime: '2026-11-02T12:30:00.000Z',
        },
      );
      expect(new Date(rescheduledC.startTime).toISOString()).toBe('2026-11-02T12:30:00.000Z');

      // Verificar evento de auditoría RESCHEDULED
      const eventRepo = dataSource.getRepository(AppointmentEventEntity);
      const events = await eventRepo.find({
        where: { appointmentId: appointmentC.id, eventType: AppointmentEventType.RESCHEDULED },
      });
      expect(events.length).toBe(1);
    });

    it('2.5. Debe cancelar un turno y liberar el slot para nuevas reservas', async () => {
      // Cancelamos el turno de Customer C (que estaba a las 12:30)
      const appRepo = dataSource.getRepository(AppointmentEntity);
      const appC = await appRepo.findOneOrFail({
        where: { customerId: customerC.id, status: AppointmentStatus.CONFIRMED },
      });

      const cancelled = await appointmentsService.cancel(testBusiness.id, appC.id, customerC.id);
      expect(cancelled.status).toBe(AppointmentStatus.CANCELLED_BY_CUSTOMER);
      expect(cancelled.cancelledAt).toBeDefined();

      // Al quedar cancelado, otro cliente (Customer B) debe poder reservar ese mismo horario liberado
      const newApp = await appointmentsService.create(testBusiness.id, customerB.id, {
        serviceId: individualService.id,
        resourceId: staffResource.id,
        startTime: '2026-11-02T12:30:00.000Z',
      });
      expect(newApp.id).toBeDefined();
      expect(newApp.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('2.6. Debe permitir la creación manual por parte del staff con cliente nuevo al vuelo', async () => {
      const manualApp = await appointmentsService.createManual(testBusiness.id, ownerUser.id, {
        serviceId: individualService.id,
        resourceId: staffResource.id,
        startTime: '2026-11-08T10:30:00.000Z', // dentro de la guardia del test 1.3
        newCustomer: {
          firstName: 'Ernesto',
          lastName: 'Paciente Telefónico',
          email: 'ernesto.tel@voko.test',
          phone: '+54 11 5555 4444',
        },
      });

      expect(manualApp.id).toBeDefined();
      expect(manualApp.status).toBe(AppointmentStatus.CONFIRMED);

      // Verificar que el nuevo usuario fue creado y vinculado al negocio
      const userRepo = dataSource.getRepository(UserEntity);
      const createdUser = await userRepo.findOne({ where: { email: 'ernesto.tel@voko.test' } });
      expect(createdUser).toBeDefined();
      expect(createdUser?.firstName).toBe('Ernesto');
    });
  });

  describe('3. Actividades Grupales y Control de Cupos (SessionsService)', () => {
    let spinningSessionId: string;

    it('3.1. Debe crear una sesión grupal con límite estricto de capacidad', async () => {
      const session = await sessionsService.createSession(testBusiness.id, {
        serviceId: groupService.id,
        branchId: testBranch.id,
        resourceId: roomResource.id,
        startTime: '2026-11-05T18:00:00.000Z',
        endTime: '2026-11-05T18:45:00.000Z',
        maxCapacity: 2, // Cupo limitado a 2 personas
      });

      expect(session.id).toBeDefined();
      expect(session.currentAttendees).toBe(0);
      expect(session.maxCapacity).toBe(2);
      expect(session.status).toBe(SessionStatus.OPEN);

      spinningSessionId = session.id;
    });

    it('3.2. Debe inscribir participantes e incrementar currentAttendees', async () => {
      const join1 = await sessionsService.joinSession(
        testBusiness.id,
        spinningSessionId,
        customerA.id,
      );

      expect(join1.session.currentAttendees).toBe(1);
      expect(join1.session.status).toBe(SessionStatus.OPEN);
      expect(join1.appointment.sessionId).toBe(spinningSessionId);
      expect(join1.appointment.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('3.3. Debe rechazar inscripciones duplicadas del mismo cliente en la misma sesión', async () => {
      await expect(
        sessionsService.joinSession(testBusiness.id, spinningSessionId, customerA.id),
      ).rejects.toThrow(ConflictException);
    });

    it('3.4. CONTROL DE CUPOS Y OVERBOOKING: Al completarse el cupo máximo, rechaza nuevas inscripciones con ConflictException', async () => {
      // Queda 1 solo cupo disponible (currentAttendees = 1, maxCapacity = 2).
      // 1. Cliente B toma el último cupo disponible
      const joinB = await sessionsService.joinSession(
        testBusiness.id,
        spinningSessionId,
        customerB.id,
      );

      expect(joinB.session.currentAttendees).toBe(2);
      expect(joinB.session.status).toBe(SessionStatus.FULL);

      // 2. Cliente C intenta inscribirse cuando el cupo está agotado -> Rechazado con 409 Conflict
      await expect(
        sessionsService.joinSession(testBusiness.id, spinningSessionId, customerC.id),
      ).rejects.toThrow(ConflictException);

      // 3. Verificar que la sesión en base de datos mantiene currentAttendees = 2 y nunca supera maxCapacity
      const sessionRepo = dataSource.getRepository(SessionEntity);
      const fullSession = await sessionRepo.findOneOrFail({ where: { id: spinningSessionId } });
      expect(fullSession.currentAttendees).toBe(2);
      expect(fullSession.status).toBe(SessionStatus.FULL);
    });

    it('3.5. Al desuscribirse (leaveSession), debe liberar el cupo y retornar la sesión a estado OPEN', async () => {
      // Customer A se da de baja
      const updatedSession = await sessionsService.leaveSession(
        testBusiness.id,
        spinningSessionId,
        customerA.id,
      );

      expect(updatedSession.currentAttendees).toBe(1);
      expect(updatedSession.status).toBe(SessionStatus.OPEN);

      // Ahora el cliente que había quedado afuera (o un nuevo cliente) puede ocupar el lugar liberado
      const joinLate = await sessionsService.joinSession(
        testBusiness.id,
        spinningSessionId,
        customerA.id,
      );
      expect(joinLate.session.currentAttendees).toBe(2);
      expect(joinLate.session.status).toBe(SessionStatus.FULL);
    });
  });
});
