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
  SessionStatus,
} from '@voko/shared';
import * as argon2 from 'argon2';

export async function runDevSeeds(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(UserEntity);
  const businessRepo = dataSource.getRepository(BusinessEntity);
  const branchRepo = dataSource.getRepository(BranchEntity);
  const membershipRepo = dataSource.getRepository(BusinessMembershipEntity);
  const serviceRepo = dataSource.getRepository(ServiceEntity);
  const resourceRepo = dataSource.getRepository(ResourceEntity);
  const srRepo = dataSource.getRepository(ServiceResourceEntity);
  const ruleRepo = dataSource.getRepository(AvailabilityRuleEntity);
  const sessionRepo = dataSource.getRepository(SessionEntity);
  const appRepo = dataSource.getRepository(AppointmentEntity);
  const settingsRepo = dataSource.getRepository(BusinessSettingsEntity);

  console.log('🧹 Limpiando tablas previas de desarrollo...');
  // Limpiar tablas para evitar duplicados en re-runs
  await dataSource.query(`
    TRUNCATE TABLE 
      appointments, 
      sessions, 
      service_resources, 
      availability_rules, 
      availability_exceptions, 
      services, 
      resources, 
      business_memberships, 
      business_settings, 
      branches, 
      businesses, 
      auth_sessions, 
      users 
    CASCADE;
  `);

  console.log('🔐 Hasheando contraseñas seguras...');
  const hashSuperadmin = await argon2.hash('VokoSuperAdmin2026!');
  const hashPassword123 = await argon2.hash('Password123!');
  const hashSecret123 = await argon2.hash('Secret123!');

  // ========================================================
  // 1. USUARIOS
  // ========================================================
  console.log('👤 Creando usuarios...');

  // 1.1 Superadmin principal
  await userRepo.save(
    userRepo.create({
      firstName: 'Superadmin',
      lastName: 'Voko',
      email: 'superadmin@voko.test',
      isActive: true,
      isSuperadmin: true,
      passwordHash: hashSuperadmin,
      emailVerifiedAt: new Date(),
    }),
  );

  // 1.2 Superadmin alternativo (admin@voko.app)
  await userRepo.save(
    userRepo.create({
      firstName: 'Operador',
      lastName: 'Global',
      email: 'admin@voko.app',
      isActive: true,
      isSuperadmin: true,
      passwordHash: hashSecret123,
      emailVerifiedAt: new Date(),
    }),
  );

  // 1.3 Dueño de Negocio (Barbería)
  const barberOwner = await userRepo.save(
    userRepo.create({
      firstName: 'Mateo',
      lastName: 'Barbero',
      email: 'owner@vokobarber.test',
      phone: '+54 11 5555-1234',
      isActive: true,
      isSuperadmin: false,
      passwordHash: hashPassword123,
      emailVerifiedAt: new Date(),
    }),
  );

  // 1.4 Dueño de Negocio (Dental)
  const dentalOwner = await userRepo.save(
    userRepo.create({
      firstName: 'Sofía',
      lastName: 'Sonrisas',
      email: 'owner@dentalvoko.test',
      phone: '+54 11 4444-9876',
      isActive: true,
      isSuperadmin: false,
      passwordHash: hashPassword123,
      emailVerifiedAt: new Date(),
    }),
  );

  // 1.5 Dueño / Admin Demo (nicolas@voko.test)
  const nicolasUser = await userRepo.save(
    userRepo.create({
      firstName: 'Nicolás',
      lastName: 'Demo',
      email: 'nicolas@voko.test',
      phone: '+54 11 3333-0000',
      isActive: true,
      isSuperadmin: false,
      passwordHash: hashSecret123,
      emailVerifiedAt: new Date(),
    }),
  );

  // 1.6 Staff / Profesional Barbería
  const barberStaff = await userRepo.save(
    userRepo.create({
      firstName: 'Lucas',
      lastName: 'Estilista',
      email: 'barbero@vokobarber.test',
      phone: '+54 11 5555-4321',
      isActive: true,
      isSuperadmin: false,
      passwordHash: hashPassword123,
      emailVerifiedAt: new Date(),
    }),
  );

  // 1.7 Cliente Principal
  const customer1 = await userRepo.save(
    userRepo.create({
      firstName: 'Agustín',
      lastName: 'Pérez',
      email: 'cliente1@test.com',
      phone: '+54 9 11 1234-5678',
      isActive: true,
      isSuperadmin: false,
      passwordHash: hashPassword123,
      emailVerifiedAt: new Date(),
    }),
  );

  // 1.8 Clientes adicionales
  const customer2 = await userRepo.save(
    userRepo.create({
      firstName: 'Camila',
      lastName: 'Gómez',
      email: 'camila.gomez@example.com',
      phone: '+54 9 11 9876-5432',
      isActive: true,
      isSuperadmin: false,
      passwordHash: hashPassword123,
      emailVerifiedAt: new Date(),
    }),
  );

  // ========================================================
  // 2. NEGOCIO 1: Voko Barber Club (Modalidad A - Citas 1 a 1)
  // ========================================================
  console.log('💈 Creando Negocio 1: Voko Barber Club...');
  const business1 = await businessRepo.save(
    businessRepo.create({
      name: 'Voko Barber Club',
      slug: 'voko-barber',
      description: 'Cortes clásicos, afeitado tradicional y perfilado de barba de primer nivel.',
      industry: 'Barbería y Estética',
      contactEmail: 'contacto@vokobarber.test',
      phone: '+54 11 5555-1234',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      status: BusinessStatus.ACTIVE,
    }),
  );

  await settingsRepo.save(
    settingsRepo.create({
      businessId: business1.id,
      brandPrimaryColor: '#F59E0B',
      brandSecondaryColor: '#EA580C',
      defaultSlotIntervalMinutes: 30,
      allowPublicBooking: true,
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
      userId: nicolasUser.id,
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

  const branchBarber = await branchRepo.save(
    branchRepo.create({
      businessId: business1.id,
      name: 'Sede Palermo Soho',
      address: 'Honduras 4820',
      city: 'Buenos Aires',
      phone: '+54 11 5555-1234',
      isDefault: true,
      isActive: true,
    }),
  );

  const serviceCorte = await serviceRepo.save(
    serviceRepo.create({
      businessId: business1.id,
      name: 'Corte de Cabello Clásico',
      description: 'Lavado, corte a tijera o máquina y peinado profesional con pomada.',
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

  const serviceBarba = await serviceRepo.save(
    serviceRepo.create({
      businessId: business1.id,
      name: 'Perfilado de Barba & Toalla Caliente',
      description: 'Afeitado tradicional con navaja, toallas calientes y bálsamo hidratante.',
      durationMinutes: 30,
      price: 6000.0,
      currency: 'ARS',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 5,
      minBookingNoticeMinutes: 60,
      maxBookingAdvanceDays: 30,
      bookingMode: BookingMode.INDIVIDUAL,
      confirmationMode: ConfirmationMode.AUTOMATIC,
      isActive: true,
    }),
  );

  const serviceCombo = await serviceRepo.save(
    serviceRepo.create({
      businessId: business1.id,
      name: 'Combo Completo Corte + Barba',
      description: 'Experiencia integral: corte de cabello + perfilado de barba completo.',
      durationMinutes: 60,
      price: 13000.0,
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
      branchId: branchBarber.id,
      userId: barberOwner.id,
      name: 'Mateo (Barbero Senior)',
      resourceType: ResourceType.STAFF,
      isActive: true,
    }),
  );

  const resourceLucas = await resourceRepo.save(
    resourceRepo.create({
      businessId: business1.id,
      branchId: branchBarber.id,
      userId: barberStaff.id,
      name: 'Lucas (Estilista)',
      resourceType: ResourceType.STAFF,
      isActive: true,
    }),
  );

  await srRepo.save([
    srRepo.create({ serviceId: serviceCorte.id, resourceId: resourceMateo.id }),
    srRepo.create({ serviceId: serviceBarba.id, resourceId: resourceMateo.id }),
    srRepo.create({ serviceId: serviceCombo.id, resourceId: resourceMateo.id }),
    srRepo.create({ serviceId: serviceCorte.id, resourceId: resourceLucas.id }),
    srRepo.create({ serviceId: serviceBarba.id, resourceId: resourceLucas.id }),
  ]);

  // Horarios de disponibilidad Mateo y Lucas (Lunes a Sábado 09:00 a 20:00)
  for (let day = 1; day <= 6; day++) {
    await ruleRepo.save([
      ruleRepo.create({
        businessId: business1.id,
        resourceId: resourceMateo.id,
        dayOfWeek: day,
        startTime: '09:00:00',
        endTime: '20:00:00',
        isActive: true,
      }),
      ruleRepo.create({
        businessId: business1.id,
        resourceId: resourceLucas.id,
        dayOfWeek: day,
        startTime: '10:00:00',
        endTime: '19:00:00',
        isActive: true,
      }),
    ]);
  }

  // ========================================================
  // 3. NEGOCIO 2: Clínica Dental Sonrisas (Modalidad A & C)
  // ========================================================
  console.log('🦷 Creando Negocio 2: Clínica Dental Sonrisas...');
  const business2 = await businessRepo.save(
    businessRepo.create({
      name: 'Clínica Dental Sonrisas',
      slug: 'sonrisas-dental',
      description: 'Consultas odontológicas, implantes, ortodoncia y estética dental de vanguardia.',
      industry: 'Salud y Odontología',
      contactEmail: 'contacto@dentalvoko.test',
      phone: '+54 11 4444-9876',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      status: BusinessStatus.ACTIVE,
    }),
  );

  await settingsRepo.save(
    settingsRepo.create({
      businessId: business2.id,
      brandPrimaryColor: '#0EA5E9',
      brandSecondaryColor: '#2563EB',
      defaultSlotIntervalMinutes: 30,
      allowPublicBooking: true,
    }),
  );

  await membershipRepo.save([
    membershipRepo.create({
      businessId: business2.id,
      userId: dentalOwner.id,
      role: UserRole.OWNER,
      status: MembershipStatus.ACTIVE,
    }),
    membershipRepo.create({
      businessId: business2.id,
      userId: nicolasUser.id,
      role: UserRole.OWNER,
      status: MembershipStatus.ACTIVE,
    }),
    membershipRepo.create({
      businessId: business2.id,
      userId: customer1.id,
      role: UserRole.CUSTOMER,
      status: MembershipStatus.ACTIVE,
    }),
  ]);

  const branchDental = await branchRepo.save(
    branchRepo.create({
      businessId: business2.id,
      name: 'Sede Belgrano R',
      address: 'Av. Cabildo 2140, Piso 3',
      city: 'Buenos Aires',
      phone: '+54 11 4444-9876',
      isDefault: true,
      isActive: true,
    }),
  );

  const serviceConsulta = await serviceRepo.save(
    serviceRepo.create({
      businessId: business2.id,
      name: 'Consulta Diagnóstica Odontológica',
      description: 'Examen bucal integral, radiografías panorámicas y plan de tratamiento.',
      durationMinutes: 30,
      price: 15000.0,
      currency: 'ARS',
      bookingMode: BookingMode.INDIVIDUAL,
      confirmationMode: ConfirmationMode.AUTOMATIC,
      isActive: true,
    }),
  );

  const serviceLimpieza = await serviceRepo.save(
    serviceRepo.create({
      businessId: business2.id,
      name: 'Limpieza Dental con Ultrasonido',
      description: 'Eliminación de sarro, manchas y profilaxis completa.',
      durationMinutes: 45,
      price: 22000.0,
      currency: 'ARS',
      bookingMode: BookingMode.INDIVIDUAL,
      confirmationMode: ConfirmationMode.AUTOMATIC,
      isActive: true,
    }),
  );

  const resourceSofia = await resourceRepo.save(
    resourceRepo.create({
      businessId: business2.id,
      branchId: branchDental.id,
      userId: dentalOwner.id,
      name: 'Dra. Sofía Sonrisas (Odontóloga)',
      resourceType: ResourceType.STAFF,
      isActive: true,
    }),
  );

  await srRepo.save([
    srRepo.create({ serviceId: serviceConsulta.id, resourceId: resourceSofia.id }),
    srRepo.create({ serviceId: serviceLimpieza.id, resourceId: resourceSofia.id }),
  ]);

  for (let day = 1; day <= 5; day++) {
    await ruleRepo.save(
      ruleRepo.create({
        businessId: business2.id,
        resourceId: resourceSofia.id,
        dayOfWeek: day,
        startTime: '09:00:00',
        endTime: '18:00:00',
        isActive: true,
      }),
    );
  }

  // ========================================================
  // 4. NEGOCIO 3: Gimnasio Olympus (Modalidad B - Sesiones Grupales)
  // ========================================================
  console.log('🏋️ Creando Negocio 3: Gimnasio Olympus...');
  const business3 = await businessRepo.save(
    businessRepo.create({
      name: 'Gimnasio Olympus',
      slug: 'olympus-gym',
      description: 'Clases grupales de fitness, spinning y cross training con cupos controlados.',
      industry: 'Fitness y Deporte',
      contactEmail: 'info@olympusgym.test',
      phone: '+54 11 6666-7777',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      status: BusinessStatus.ACTIVE,
    }),
  );

  await settingsRepo.save(
    settingsRepo.create({
      businessId: business3.id,
      brandPrimaryColor: '#F43F5E',
      brandSecondaryColor: '#E11D48',
      defaultSlotIntervalMinutes: 60,
      allowPublicBooking: true,
    }),
  );

  const branchGym = await branchRepo.save(
    branchRepo.create({
      businessId: business3.id,
      name: 'Sede Caballito',
      address: 'Av. Rivadavia 5600',
      city: 'Buenos Aires',
      isDefault: true,
      isActive: true,
    }),
  );

  const serviceSpinning = await serviceRepo.save(
    serviceRepo.create({
      businessId: business3.id,
      name: 'Spinning Power 50 min',
      description: 'Sesión aeróbica de alta intensidad en bicicletas de última generación.',
      durationMinutes: 50,
      price: 5500.0,
      currency: 'ARS',
      bookingMode: BookingMode.GROUP_SESSION,
      confirmationMode: ConfirmationMode.AUTOMATIC,
      isActive: true,
    }),
  );

  // Sesión grupal programada para mañana a las 10:00 AM
  const sessionTomorrow = new Date();
  sessionTomorrow.setDate(sessionTomorrow.getDate() + 1);
  sessionTomorrow.setHours(10, 0, 0, 0);

  const sessionTomorrowEnd = new Date(sessionTomorrow);
  sessionTomorrowEnd.setMinutes(sessionTomorrowEnd.getMinutes() + 50);

  await sessionRepo.save(
    sessionRepo.create({
      businessId: business3.id,
      branchId: branchGym.id,
      serviceId: serviceSpinning.id,
      startTime: sessionTomorrow,
      endTime: sessionTomorrowEnd,
      maxCapacity: 15,
      currentAttendees: 1,
      status: SessionStatus.OPEN,
    }),
  );

  // ========================================================
  // 5. NEGOCIO 4: Complejo Deportivo Voko (Modalidad C - Recursos Físicos)
  // ========================================================
  console.log('🎾 Creando Negocio 4: Complejo Deportivo Voko...');
  const business4 = await businessRepo.save(
    businessRepo.create({
      name: 'Complejo Deportivo Voko',
      slug: 'voko-complex',
      description: 'Alquiler de canchas de pádel panorámicas de césped sintético e iluminación LED.',
      industry: 'Espacios Físicos y Pádel',
      contactEmail: 'reservas@vokocomplex.test',
      phone: '+54 11 7777-8888',
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      status: BusinessStatus.ACTIVE,
    }),
  );

  await settingsRepo.save(
    settingsRepo.create({
      businessId: business4.id,
      brandPrimaryColor: '#10B981',
      brandSecondaryColor: '#0D9488',
      defaultSlotIntervalMinutes: 90,
      allowPublicBooking: true,
    }),
  );

  const branchComplex = await branchRepo.save(
    branchRepo.create({
      businessId: business4.id,
      name: 'Sede Costanera Norte',
      address: 'Av. Costanera Rafael Obligado 2000',
      city: 'Buenos Aires',
      isDefault: true,
      isActive: true,
    }),
  );

  const servicePadel = await serviceRepo.save(
    serviceRepo.create({
      businessId: business4.id,
      name: 'Alquiler Cancha Pádel Techada 90 min',
      durationMinutes: 90,
      price: 24000.0,
      currency: 'ARS',
      bookingMode: BookingMode.RESOURCE_ONLY,
      confirmationMode: ConfirmationMode.AUTOMATIC,
      isActive: true,
    }),
  );

  const cancha1 = await resourceRepo.save(
    resourceRepo.create({
      businessId: business4.id,
      branchId: branchComplex.id,
      name: 'Cancha 1 (Cristal Techada)',
      resourceType: ResourceType.COURT,
      isActive: true,
    }),
  );

  await srRepo.save(
    srRepo.create({
      serviceId: servicePadel.id,
      resourceId: cancha1.id,
    }),
  );

  // ========================================================
  // 6. TURNOS Y CITAS REALES PARA EL CLIENTE (cliente1@test.com)
  // ========================================================
  console.log('📅 Generando turnos representativos (próximos e históricos) para cliente1@test.com...');

  // 6.1 Turno Próximo 1: Dentro de 2 días a las 11:00 AM en Barbería
  const upcomingDate1 = new Date();
  upcomingDate1.setDate(upcomingDate1.getDate() + 2);
  upcomingDate1.setHours(11, 0, 0, 0);

  const upcomingDate1End = new Date(upcomingDate1);
  upcomingDate1End.setMinutes(upcomingDate1End.getMinutes() + 40);

  await appRepo.save(
    appRepo.create({
      businessId: business1.id,
      branchId: branchBarber.id,
      serviceId: serviceCorte.id,
      resourceId: resourceMateo.id,
      customerId: customer1.id,
      startTime: upcomingDate1,
      endTime: upcomingDate1End,
      status: AppointmentStatus.CONFIRMED,
      snapshotPrice: 8500.0,
      snapshotDurationMinutes: 40,
      snapshotCurrency: 'ARS',
      customerNotes: 'Corte degradé medio con tijera arriba.',
    }),
  );

  // 6.2 Turno Próximo 2: Dentro de 5 días a las 15:30 PM en Odontología
  const upcomingDate2 = new Date();
  upcomingDate2.setDate(upcomingDate2.getDate() + 5);
  upcomingDate2.setHours(15, 30, 0, 0);

  const upcomingDate2End = new Date(upcomingDate2);
  upcomingDate2End.setMinutes(upcomingDate2End.getMinutes() + 45);

  await appRepo.save(
    appRepo.create({
      businessId: business2.id,
      branchId: branchDental.id,
      serviceId: serviceLimpieza.id,
      resourceId: resourceSofia.id,
      customerId: customer1.id,
      startTime: upcomingDate2,
      endTime: upcomingDate2End,
      status: AppointmentStatus.CONFIRMED,
      snapshotPrice: 22000.0,
      snapshotDurationMinutes: 45,
      snapshotCurrency: 'ARS',
      customerNotes: 'Limpieza semestral y control de encías.',
    }),
  );

  // 6.3 Turno Histórico 1: Completado hace 4 días
  const pastDate1 = new Date();
  pastDate1.setDate(pastDate1.getDate() - 4);
  pastDate1.setHours(16, 0, 0, 0);

  const pastDate1End = new Date(pastDate1);
  pastDate1End.setMinutes(pastDate1End.getMinutes() + 30);

  await appRepo.save(
    appRepo.create({
      businessId: business1.id,
      branchId: branchBarber.id,
      serviceId: serviceBarba.id,
      resourceId: resourceMateo.id,
      customerId: customer1.id,
      startTime: pastDate1,
      endTime: pastDate1End,
      status: AppointmentStatus.COMPLETED,
      snapshotPrice: 6000.0,
      snapshotDurationMinutes: 30,
      snapshotCurrency: 'ARS',
      customerNotes: 'Perfilado de barba para evento corporativo.',
    }),
  );

  // 6.4 Turno Histórico 2: Cancelado hace 12 días
  const pastDate2 = new Date();
  pastDate2.setDate(pastDate2.getDate() - 12);
  pastDate2.setHours(18, 0, 0, 0);

  const pastDate2End = new Date(pastDate2);
  pastDate2End.setMinutes(pastDate2End.getMinutes() + 60);

  await appRepo.save(
    appRepo.create({
      businessId: business1.id,
      branchId: branchBarber.id,
      serviceId: serviceCombo.id,
      resourceId: resourceLucas.id,
      customerId: customer1.id,
      startTime: pastDate2,
      endTime: pastDate2End,
      status: AppointmentStatus.CANCELLED_BY_CUSTOMER,
      snapshotPrice: 13000.0,
      snapshotDurationMinutes: 60,
      snapshotCurrency: 'ARS',
      cancellationReason: 'Reprogramación por viaje de trabajo.',
    }),
  );

  // Turno para Camila en Pádel
  const pastDateCamila = new Date();
  pastDateCamila.setDate(pastDateCamila.getDate() - 2);
  pastDateCamila.setHours(19, 0, 0, 0);

  await appRepo.save(
    appRepo.create({
      businessId: business4.id,
      branchId: branchComplex.id,
      serviceId: servicePadel.id,
      resourceId: cancha1.id,
      customerId: customer2.id,
      startTime: pastDateCamila,
      endTime: new Date(pastDateCamila.getTime() + 90 * 60 * 1000),
      status: AppointmentStatus.CONFIRMED,
      snapshotPrice: 24000.0,
      snapshotDurationMinutes: 90,
      snapshotCurrency: 'ARS',
      customerNotes: 'Traemos nuestras palas.',
    }),
  );

  console.log('✨ Semillas de desarrollo completadas exitosamente.');
}
