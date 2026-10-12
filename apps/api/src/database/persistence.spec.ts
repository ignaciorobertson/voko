import { DataSource } from 'typeorm';
import {
  ALL_ENTITIES,
  UserEntity,
  BusinessEntity,
  BranchEntity,
  BusinessMembershipEntity,
  ServiceEntity,
  ResourceEntity,
  ServiceResourceEntity,
  SessionEntity,
  AppointmentEntity,
  AppointmentEventEntity,
  BusinessSettingsEntity,
} from './entities';
import {
  UserRole,
  MembershipStatus,
  BusinessStatus,
  BookingMode,
  ConfirmationMode,
  ResourceType,
  AppointmentStatus,
  AppointmentEventType,
  SessionStatus,
} from '@voko/shared';

describe('Hito 2: Pruebas de Persistencia, Relaciones e Integridad Referencial', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      dropSchema: true,
      entities: ALL_ENTITIES,
      synchronize: true, // Habilitado solo para construir esquema en memoria en este test unitario
      logging: false,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('1. Debe inicializar el DataSource con las 18 entidades registradas', () => {
    expect(dataSource.isInitialized).toBe(true);
    expect(ALL_ENTITIES.length).toBe(18);
  });

  it('2. Debe persistir y recuperar usuarios con campos de auditoría', async () => {
    const userRepo = dataSource.getRepository(UserEntity);
    const user = userRepo.create({
      firstName: 'Federico',
      lastName: 'García',
      email: 'federico.garcia@voko.test',
      phone: '+5491112345678',
      isActive: true,
      isSuperadmin: false,
    });

    const saved = await userRepo.save(user);
    expect(saved.id).toBeDefined();
    expect(saved.createdAt).toBeInstanceOf(Date);

    const found = await userRepo.findOneBy({ id: saved.id });
    expect(found).not.toBeNull();
    expect(found?.email).toBe('federico.garcia@voko.test');
  });

  it('3. Debe impedir duplicación de cuentas de usuario con el mismo email', async () => {
    const userRepo = dataSource.getRepository(UserEntity);
    const user1 = userRepo.create({
      firstName: 'Ana',
      lastName: 'López',
      email: 'ana.lopez@voko.test',
    });
    await userRepo.save(user1);

    const user2 = userRepo.create({
      firstName: 'Ana Duplicada',
      lastName: 'López',
      email: 'ana.lopez@voko.test',
    });

    await expect(userRepo.save(user2)).rejects.toThrow();
  });

  it('4. Debe persistir un negocio con su configuración 1:1 y sucursal', async () => {
    const bizRepo = dataSource.getRepository(BusinessEntity);
    const branchRepo = dataSource.getRepository(BranchEntity);
    const settingsRepo = dataSource.getRepository(BusinessSettingsEntity);

    const business = await bizRepo.save(
      bizRepo.create({
        name: 'Gimnasio Titán',
        slug: 'gimnasio-titan',
        contactEmail: 'info@titan.test',
        timezone: 'America/Argentina/Buenos_Aires',
        status: BusinessStatus.ACTIVE,
      }),
    );

    const settings = await settingsRepo.save(
      settingsRepo.create({
        businessId: business.id,
        allowPublicBooking: true,
        brandPrimaryColor: '#0F172A',
        defaultSlotIntervalMinutes: 45,
      }),
    );

    const branch = await branchRepo.save(
      branchRepo.create({
        businessId: business.id,
        name: 'Sede Central',
        address: 'Calle Falsa 123',
        isDefault: true,
      }),
    );

    expect(business.id).toBeDefined();
    expect(settings.businessId).toBe(business.id);
    expect(branch.businessId).toBe(business.id);

    // Cargar con relaciones
    const loadedBiz = await bizRepo.findOne({
      where: { id: business.id },
      relations: ['branches', 'settings'],
    });

    expect(loadedBiz?.branches?.length).toBe(1);
    expect(loadedBiz?.branches?.[0]?.name).toBe('Sede Central');
    expect(loadedBiz?.settings?.brandPrimaryColor).toBe('#0F172A');
  });

  it('5. Debe validar membresías multi-tenant y prevenir membresías duplicadas', async () => {
    const userRepo = dataSource.getRepository(UserEntity);
    const bizRepo = dataSource.getRepository(BusinessEntity);
    const memRepo = dataSource.getRepository(BusinessMembershipEntity);

    const user = await userRepo.save(
      userRepo.create({
        firstName: 'Carlos',
        lastName: 'Dueño',
        email: 'carlos.owner@voko.test',
      }),
    );

    const business = await bizRepo.save(
      bizRepo.create({
        name: 'Clínica Dental',
        slug: 'clinica-dental',
        contactEmail: 'admin@dental.test',
      }),
    );

    const membership = await memRepo.save(
      memRepo.create({
        businessId: business.id,
        userId: user.id,
        role: UserRole.OWNER,
        status: MembershipStatus.ACTIVE,
      }),
    );

    expect(membership.id).toBeDefined();
    expect(membership.role).toBe(UserRole.OWNER);

    // Intento de duplicar membresía para el mismo usuario y negocio debe fallar
    const duplicateMembership = memRepo.create({
      businessId: business.id,
      userId: user.id,
      role: UserRole.ADMIN,
    });

    await expect(memRepo.save(duplicateMembership)).rejects.toThrow();
  });

  it('6. Modalidad A: Debe persistir turno individual con servicio, profesional y buffers', async () => {
    const bizRepo = dataSource.getRepository(BusinessEntity);
    const branchRepo = dataSource.getRepository(BranchEntity);
    const serviceRepo = dataSource.getRepository(ServiceEntity);
    const resRepo = dataSource.getRepository(ResourceEntity);
    const srRepo = dataSource.getRepository(ServiceResourceEntity);
    const userRepo = dataSource.getRepository(UserEntity);
    const appRepo = dataSource.getRepository(AppointmentEntity);

    const biz = await bizRepo.save(
      bizRepo.create({ name: 'Barbería Moderna', slug: 'barberia-moderna', contactEmail: 'b@m.test' }),
    );
    const branch = await branchRepo.save(
      branchRepo.create({ businessId: biz.id, name: 'Local 1', isDefault: true }),
    );

    const service = await serviceRepo.save(
      serviceRepo.create({
        businessId: biz.id,
        name: 'Corte + Barba',
        durationMinutes: 45,
        price: 9000,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 10,
        bookingMode: BookingMode.INDIVIDUAL,
      }),
    );

    const staffUser = await userRepo.save(
      userRepo.create({ firstName: 'Sebastián', lastName: 'Corte', email: 'seba@m.test' }),
    );

    const resource = await resRepo.save(
      resRepo.create({
        businessId: biz.id,
        branchId: branch.id,
        userId: staffUser.id,
        name: 'Sebastián',
        resourceType: ResourceType.STAFF,
      }),
    );

    await srRepo.save(
      srRepo.create({ serviceId: service.id, resourceId: resource.id }),
    );

    const customer = await userRepo.save(
      userRepo.create({ firstName: 'Julián', lastName: 'Cliente', email: 'julian@test.com' }),
    );

    const appointment = await appRepo.save(
      appRepo.create({
        businessId: biz.id,
        branchId: branch.id,
        serviceId: service.id,
        resourceId: resource.id,
        customerId: customer.id,
        startTime: new Date('2026-10-20T14:00:00Z'),
        endTime: new Date('2026-10-20T14:45:00Z'),
        status: AppointmentStatus.CONFIRMED,
        snapshotPrice: 9000,
        snapshotDurationMinutes: 45,
        snapshotCurrency: 'ARS',
      }),
    );

    expect(appointment.id).toBeDefined();
    expect(appointment.resourceId).toBe(resource.id);
    expect(appointment.status).toBe(AppointmentStatus.CONFIRMED);
    expect(Number(appointment.snapshotPrice)).toBe(9000);
  });

  it('7. Modalidad B: Debe persistir sesión grupal y controlar capacidad de cupos', async () => {
    const bizRepo = dataSource.getRepository(BusinessEntity);
    const branchRepo = dataSource.getRepository(BranchEntity);
    const serviceRepo = dataSource.getRepository(ServiceEntity);
    const sessionRepo = dataSource.getRepository(SessionEntity);
    const userRepo = dataSource.getRepository(UserEntity);
    const appRepo = dataSource.getRepository(AppointmentEntity);

    const biz = await bizRepo.save(
      bizRepo.create({ name: 'Studio Pilates', slug: 'studio-pilates', contactEmail: 'pilates@test.com' }),
    );
    const branch = await branchRepo.save(
      branchRepo.create({ businessId: biz.id, name: 'Sede Norte' }),
    );

    const service = await serviceRepo.save(
      serviceRepo.create({
        businessId: biz.id,
        name: 'Reformer Mat',
        durationMinutes: 50,
        price: 7500,
        bookingMode: BookingMode.GROUP_SESSION,
      }),
    );

    const session = await sessionRepo.save(
      sessionRepo.create({
        businessId: biz.id,
        branchId: branch.id,
        serviceId: service.id,
        startTime: new Date('2026-10-22T09:00:00Z'),
        endTime: new Date('2026-10-22T09:50:00Z'),
        maxCapacity: 8,
        currentAttendees: 0,
        status: SessionStatus.OPEN,
      }),
    );

    expect(session.id).toBeDefined();
    expect(session.maxCapacity).toBe(8);
    expect(session.currentAttendees).toBe(0);

    const student = await userRepo.save(
      userRepo.create({ firstName: 'Laura', lastName: 'Paz', email: 'laura@test.com' }),
    );

    // Inscribir alumna vinculando appointment a la sesión
    const studentBooking = await appRepo.save(
      appRepo.create({
        businessId: biz.id,
        branchId: branch.id,
        serviceId: service.id,
        sessionId: session.id,
        customerId: student.id,
        startTime: session.startTime,
        endTime: session.endTime,
        status: AppointmentStatus.CONFIRMED,
        snapshotPrice: 7500,
        snapshotDurationMinutes: 50,
        snapshotCurrency: 'ARS',
      }),
    );

    session.currentAttendees += 1;
    await sessionRepo.save(session);

    const updatedSession = await sessionRepo.findOneBy({ id: session.id });
    expect(studentBooking.sessionId).toBe(session.id);
    expect(updatedSession?.currentAttendees).toBe(1);
  });

  it('8. Modalidad C: Debe persistir reserva de recurso físico (cancha) sin profesional obligatorio', async () => {
    const bizRepo = dataSource.getRepository(BusinessEntity);
    const branchRepo = dataSource.getRepository(BranchEntity);
    const serviceRepo = dataSource.getRepository(ServiceEntity);
    const resRepo = dataSource.getRepository(ResourceEntity);
    const userRepo = dataSource.getRepository(UserEntity);
    const appRepo = dataSource.getRepository(AppointmentEntity);

    const biz = await bizRepo.save(
      bizRepo.create({ name: 'Club de Tenis', slug: 'club-tenis', contactEmail: 'tenis@test.com' }),
    );
    const branch = await branchRepo.save(
      branchRepo.create({ businessId: biz.id, name: 'Complejo Outdoor' }),
    );

    const service = await serviceRepo.save(
      serviceRepo.create({
        businessId: biz.id,
        name: 'Alquiler Cancha Ladrillo 60m',
        durationMinutes: 60,
        price: 15000,
        bookingMode: BookingMode.RESOURCE_ONLY,
      }),
    );

    const court = await resRepo.save(
      resRepo.create({
        businessId: biz.id,
        branchId: branch.id,
        name: 'Cancha Central (Polvo de Ladrillo)',
        resourceType: ResourceType.COURT,
      }),
    );

    const player = await userRepo.save(
      userRepo.create({ firstName: 'Tomás', lastName: 'Tenista', email: 'tomas@test.com' }),
    );

    const booking = await appRepo.save(
      appRepo.create({
        businessId: biz.id,
        branchId: branch.id,
        serviceId: service.id,
        resourceId: court.id,
        customerId: player.id,
        startTime: new Date('2026-10-25T11:00:00Z'),
        endTime: new Date('2026-10-25T12:00:00Z'),
        status: AppointmentStatus.CONFIRMED,
        snapshotPrice: 15000,
        snapshotDurationMinutes: 60,
        snapshotCurrency: 'ARS',
      }),
    );

    expect(booking.id).toBeDefined();
    expect(booking.resourceId).toBe(court.id);
    expect(booking.sessionId).toBeFalsy(); // Sin sesión grupal (null en base de datos)
  });

  it('9. Debe registrar eventos de ciclo de vida del turno para auditoría', async () => {
    const appRepo = dataSource.getRepository(AppointmentEntity);
    const eventRepo = dataSource.getRepository(AppointmentEventEntity);

    const someApp = await appRepo.findOne({ where: {} });
    expect(someApp).not.toBeNull();

    const event = await eventRepo.save(
      eventRepo.create({
        appointmentId: someApp!.id,
        eventType: AppointmentEventType.CONFIRMED,
        previousStatus: AppointmentStatus.PENDING,
        newStatus: AppointmentStatus.CONFIRMED,
        metadata: { reason: 'Confirmación automática de sistema' },
      }),
    );

    expect(event.id).toBeDefined();
    expect(event.eventType).toBe(AppointmentEventType.CONFIRMED);
    expect(event.createdAt).toBeInstanceOf(Date);
  });
});
