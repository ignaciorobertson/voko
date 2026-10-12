import { DataSource } from 'typeorm';
import {
  UserEntity,
  BusinessEntity,
  BranchEntity,
  BusinessMembershipEntity,
  ServiceEntity,
  ResourceEntity,
  ServiceResourceEntity,
  AvailabilityRuleEntity,
  AvailabilityExceptionEntity,
  SessionEntity,
  AppointmentEntity,
  BusinessSettingsEntity,
} from '../entities';
import {
  UserRole,
  MembershipStatus,
  BusinessStatus,
  BookingMode,
  ConfirmationMode,
  ResourceType,
  AppointmentStatus,
  ExceptionType,
  SessionStatus,
} from '@voko/shared';

export async function runDevSeeds(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(UserEntity);
  const businessRepo = dataSource.getRepository(BusinessEntity);
  const branchRepo = dataSource.getRepository(BranchEntity);
  const membershipRepo = dataSource.getRepository(BusinessMembershipEntity);
  const serviceRepo = dataSource.getRepository(ServiceEntity);
  const resourceRepo = dataSource.getRepository(ResourceEntity);
  const srRepo = dataSource.getRepository(ServiceResourceEntity);
  const ruleRepo = dataSource.getRepository(AvailabilityRuleEntity);
  const excRepo = dataSource.getRepository(AvailabilityExceptionEntity);
  const sessionRepo = dataSource.getRepository(SessionEntity);
  const appRepo = dataSource.getRepository(AppointmentEntity);
  const settingsRepo = dataSource.getRepository(BusinessSettingsEntity);

  // 1. Superadmin Global
  const superadmin = await userRepo.save(
    userRepo.create({
      firstName: 'Operador',
      lastName: 'Voko',
      email: 'admin@voko.app',
      isActive: true,
      isSuperadmin: true,
      passwordHash: '$argon2id$v=19$m=65536,p=4,t=3$4Vm7VYKT/OjQsHlAei1v3w$LIIJqAQ1IGPHiM/J5i0n/vAaBsW7YCRC+NJuPHcFRfY',
      emailVerifiedAt: new Date(),
    }),
  );

  // 2. Propietario Negocio 1 (Barbería)
  const barberOwner = await userRepo.save(
    userRepo.create({
      firstName: 'Mateo',
      lastName: 'Barbero',
      email: 'mateo@barberiacapital.com',
      isActive: true,
      passwordHash: '$argon2id$v=19$m=65536,p=4,t=3$4Vm7VYKT/OjQsHlAei1v3w$LIIJqAQ1IGPHiM/J5i0n/vAaBsW7YCRC+NJuPHcFRfY',
      emailVerifiedAt: new Date(),
    }),
  );

  // 3. Profesional Staff Negocio 1
  const barberStaff = await userRepo.save(
    userRepo.create({
      firstName: 'Lucas',
      lastName: 'Estilista',
      email: 'lucas@barberiacapital.com',
      isActive: true,
      emailVerifiedAt: new Date(),
    }),
  );

  // 4. Clientes
  const customer1 = await userRepo.save(
    userRepo.create({
      firstName: 'Agustín',
      lastName: 'Pérez',
      email: 'agustin.perez@example.com',
      phone: '+5491123456789',
      isActive: true,
    }),
  );

  const customer2 = await userRepo.save(
    userRepo.create({
      firstName: 'Camila',
      lastName: 'Gómez',
      email: 'camila.gomez@example.com',
      phone: '+5491198765432',
      isActive: true,
    }),
  );

  // --- NEGOCIO 1: Modalidad A (Turnos Individuales) ---
  const business1 = await businessRepo.save(
    businessRepo.create({
      name: 'Barbería & Spa Capital',
      slug: 'barberia-capital',
      description: 'Cortes clásicos, afeitado tradicional y perfilado de barba de primer nivel.',
      industry: 'Barbería y Estética',
      contactEmail: 'contacto@barberiacapital.com',
      phone: '+541155551234',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      status: BusinessStatus.ACTIVE,
    }),
  );

  await settingsRepo.save(
    settingsRepo.create({
      businessId: business1.id,
      brandPrimaryColor: '#1E40AF',
      brandSecondaryColor: '#38BDF8',
      defaultSlotIntervalMinutes: 30,
    }),
  );

  await membershipRepo.save([
    membershipRepo.create({
      businessId: business1.id,
      userId: barberOwner.id,
      role: UserRole.OWNER,
      status: MembershipStatus.ACTIVE,
    }),
    membershipRepo.create({
      businessId: business1.id,
      userId: barberStaff.id,
      role: UserRole.STAFF,
      status: MembershipStatus.ACTIVE,
    }),
    membershipRepo.create({
      businessId: business1.id,
      userId: customer1.id,
      role: UserRole.CUSTOMER,
      status: MembershipStatus.ACTIVE,
    }),
  ]);

  const branchCentro = await branchRepo.save(
    branchRepo.create({
      businessId: business1.id,
      name: 'Sucursal Centro',
      address: 'Av. Corrientes 1234',
      city: 'Buenos Aires',
      isDefault: true,
      isActive: true,
    }),
  );

  const serviceCorte = await serviceRepo.save(
    serviceRepo.create({
      businessId: business1.id,
      name: 'Corte de Cabello Clásico',
      description: 'Lavado, corte a tijera o máquina y peinado.',
      durationMinutes: 40,
      price: 8500.0,
      currency: 'ARS',
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 10,
      minBookingNoticeMinutes: 60,
      maxBookingAdvanceDays: 30,
      bookingMode: BookingMode.INDIVIDUAL,
      confirmationMode: ConfirmationMode.AUTOMATIC,
      isActive: true,
    }),
  );

  const resourceMateo = await resourceRepo.save(
    resourceRepo.create({
      businessId: business1.id,
      branchId: branchCentro.id,
      userId: barberOwner.id,
      name: 'Mateo (Barbero Senior)',
      resourceType: ResourceType.STAFF,
      isActive: true,
    }),
  );

  await srRepo.save(
    srRepo.create({
      serviceId: serviceCorte.id,
      resourceId: resourceMateo.id,
    }),
  );

  // Horario Lunes a Viernes de 09:00 a 19:00
  for (let day = 1; day <= 5; day++) {
    await ruleRepo.save(
      ruleRepo.create({
        businessId: business1.id,
        resourceId: resourceMateo.id,
        dayOfWeek: day,
        startTime: '09:00:00',
        endTime: '19:00:00',
        isActive: true,
      }),
    );
  }

  // --- NEGOCIO 2: Modalidad B (Sesiones Grupales con Cupos) ---
  const business2 = await businessRepo.save(
    businessRepo.create({
      name: 'Centro de Yoga & Movimiento',
      slug: 'yoga-movimiento',
      description: 'Clases grupales de yoga, respiración y meditación con cupos limitados.',
      industry: 'Bienestar y Deporte',
      contactEmail: 'hola@yogamovimiento.com',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      status: BusinessStatus.ACTIVE,
    }),
  );

  const branchPalermo = await branchRepo.save(
    branchRepo.create({
      businessId: business2.id,
      name: 'Sede Palermo',
      address: 'Honduras 4567',
      city: 'Buenos Aires',
      isDefault: true,
      isActive: true,
    }),
  );

  const serviceYoga = await serviceRepo.save(
    serviceRepo.create({
      businessId: business2.id,
      name: 'Clase de Hatha Yoga',
      description: 'Práctica fluida multinivel.',
      durationMinutes: 60,
      price: 6000.0,
      currency: 'ARS',
      bookingMode: BookingMode.GROUP_SESSION,
      confirmationMode: ConfirmationMode.AUTOMATIC,
      isActive: true,
    }),
  );

  // Sesión grupal programada con cupo máximo de 12 personas
  const sessionManana = await sessionRepo.save(
    sessionRepo.create({
      businessId: business2.id,
      branchId: branchPalermo.id,
      serviceId: serviceYoga.id,
      startTime: new Date('2026-10-15T10:00:00Z'),
      endTime: new Date('2026-10-15T11:00:00Z'),
      maxCapacity: 12,
      currentAttendees: 1,
      status: SessionStatus.OPEN,
    }),
  );

  // Turno de Camila en la clase grupal
  await appRepo.save(
    appRepo.create({
      businessId: business2.id,
      branchId: branchPalermo.id,
      serviceId: serviceYoga.id,
      sessionId: sessionManana.id,
      customerId: customer2.id,
      startTime: sessionManana.startTime,
      endTime: sessionManana.endTime,
      status: AppointmentStatus.CONFIRMED,
      snapshotPrice: 6000.0,
      snapshotDurationMinutes: 60,
      snapshotCurrency: 'ARS',
    }),
  );

  // --- NEGOCIO 3: Modalidad C (Reserva de Recurso Físico - Cancha) ---
  const business3 = await businessRepo.save(
    businessRepo.create({
      name: 'Complejo Deportivo El Pádel',
      slug: 'complejo-el-padel',
      description: 'Alquiler de canchas de pádel panorámicas e iluminación LED.',
      industry: 'Deportes y Canchas',
      contactEmail: 'info@elpadel.com',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      status: BusinessStatus.ACTIVE,
    }),
  );

  const branchCostanera = await branchRepo.save(
    branchRepo.create({
      businessId: business3.id,
      name: 'Sede Costanera',
      address: 'Av. Rafael Obligado 2000',
      city: 'Buenos Aires',
      isDefault: true,
      isActive: true,
    }),
  );

  const serviceAlquilerCancha = await serviceRepo.save(
    serviceRepo.create({
      businessId: business3.id,
      name: 'Alquiler Cancha Pádel Techada 90 min',
      durationMinutes: 90,
      price: 24000.0,
      currency: 'ARS',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      bookingMode: BookingMode.RESOURCE_ONLY,
      confirmationMode: ConfirmationMode.AUTOMATIC,
      isActive: true,
    }),
  );

  const cancha1 = await resourceRepo.save(
    resourceRepo.create({
      businessId: business3.id,
      branchId: branchCostanera.id,
      name: 'Cancha 1 (Cristal Techada)',
      resourceType: ResourceType.COURT,
      isActive: true,
    }),
  );

  await srRepo.save(
    srRepo.create({
      serviceId: serviceAlquilerCancha.id,
      resourceId: cancha1.id,
    }),
  );

  // Turno de Agustín en la cancha 1
  await appRepo.save(
    appRepo.create({
      businessId: business3.id,
      branchId: branchCostanera.id,
      serviceId: serviceAlquilerCancha.id,
      resourceId: cancha1.id,
      customerId: customer1.id,
      startTime: new Date('2026-10-15T18:00:00Z'),
      endTime: new Date('2026-10-15T19:30:00Z'),
      status: AppointmentStatus.CONFIRMED,
      snapshotPrice: 24000.0,
      snapshotDurationMinutes: 90,
      snapshotCurrency: 'ARS',
      customerNotes: 'Traemos nuestras propias palas.',
    }),
  );
}
