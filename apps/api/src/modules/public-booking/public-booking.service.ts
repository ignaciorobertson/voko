import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DataSource, MoreThanOrEqual } from 'typeorm';
import { BusinessEntity } from '../../database/entities/business.entity';
import { BusinessSettingsEntity } from '../../database/entities/business-settings.entity';
import { BranchEntity } from '../../database/entities/branch.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { ServiceResourceEntity } from '../../database/entities/service-resource.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { BusinessMembershipEntity } from '../../database/entities/business-membership.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { SessionsService } from '../sessions/sessions.service';
import { PublicBookAppointmentDto, PublicJoinSessionDto } from './dto/public-booking.dto';
import { BusinessStatus, SessionStatus, UserRole, MembershipStatus } from '@voko/shared';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly availabilityService: AvailabilityService,
    private readonly appointmentsService: AppointmentsService,
    private readonly sessionsService: SessionsService,
  ) {}

  async getPublicBusiness(slug: string) {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const business = await businessRepo.findOne({
      where: { slug },
    });

    if (!business || business.status !== BusinessStatus.ACTIVE) {
      throw new NotFoundException(`El establecimiento '${slug}' no existe o no se encuentra activo`);
    }

    const settingsRepo = this.dataSource.getRepository(BusinessSettingsEntity);
    const settings = await settingsRepo.findOne({
      where: { businessId: business.id },
    });

    const branchRepo = this.dataSource.getRepository(BranchEntity);
    const branches = await branchRepo.find({
      where: { businessId: business.id, isActive: true },
      order: { isDefault: 'DESC', name: 'ASC' },
    });

    // Cargar servicios activos con recursos asignados
    const serviceRepo = this.dataSource.getRepository(ServiceEntity);
    const services = await serviceRepo.find({
      where: { businessId: business.id, isActive: true },
      relations: ['serviceResources', 'serviceResources.resource'],
      order: { name: 'ASC' },
    });

    const mappedServices = services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      price: s.price,
      currency: s.currency,
      bookingMode: s.bookingMode,
      confirmationMode: s.confirmationMode,
      cancellationDeadlineMinutes: s.cancellationDeadlineMinutes,
      resources: s.serviceResources
        ?.map((sr) => sr.resource)
        .filter((r): r is ResourceEntity => !!r && r.isActive)
        .map((r) => ({
          id: r.id,
          name: r.name,
          resourceType: r.resourceType,
          description: r.description,
        })) || [],
    }));

    // Cargar sesiones grupales abiertas y futuras
    const sessionRepo = this.dataSource.getRepository(SessionEntity);
    const now = new Date();
    const sessions = await sessionRepo.find({
      where: {
        businessId: business.id,
        startTime: MoreThanOrEqual(now),
        status: SessionStatus.OPEN,
      },
      relations: ['service', 'resource', 'branch'],
      order: { startTime: 'ASC' },
      take: 20,
    });

    const mappedSessions = sessions.map((sess) => ({
      id: sess.id,
      serviceId: sess.serviceId,
      serviceName: sess.service?.name,
      servicePrice: sess.service?.price,
      serviceCurrency: sess.service?.currency,
      branchName: sess.branch?.name,
      instructorName: sess.resource?.name,
      startTime: sess.startTime.toISOString(),
      endTime: sess.endTime.toISOString(),
      maxCapacity: sess.maxCapacity,
      currentAttendees: sess.currentAttendees,
      remainingSpots: Math.max(0, sess.maxCapacity - sess.currentAttendees),
      status: sess.status,
    }));

    return {
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        description: business.description,
        contactEmail: business.contactEmail,
        phone: business.phone,
        timezone: business.timezone,
      },
      settings: {
        brandPrimaryColor: settings?.brandPrimaryColor || '#0284C7',
        brandSecondaryColor: settings?.brandSecondaryColor || '#0369A1',
        allowPublicBooking: settings?.allowPublicBooking ?? true,
        defaultSlotIntervalMinutes: settings?.defaultSlotIntervalMinutes || 30,
      },
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        city: b.city,
        isDefault: b.isDefault,
      })),
      services: mappedServices,
      upcomingSessions: mappedSessions,
    };
  }

  async getPublicSlots(
    slug: string,
    query: { serviceId: string; date: string; resourceId?: string; branchId?: string },
  ) {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const business = await businessRepo.findOne({
      where: { slug },
    });

    if (!business || business.status !== BusinessStatus.ACTIVE) {
      throw new NotFoundException(`El establecimiento '${slug}' no existe o no se encuentra activo`);
    }

    return await this.availabilityService.getAvailableSlots(business.id, {
      serviceId: query.serviceId,
      date: query.date,
      resourceId: query.resourceId,
      branchId: query.branchId,
    });
  }

  async bookAppointment(slug: string, dto: PublicBookAppointmentDto) {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const business = await businessRepo.findOne({
      where: { slug },
    });

    if (!business || business.status !== BusinessStatus.ACTIVE) {
      throw new NotFoundException(`El establecimiento '${slug}' no existe o no se encuentra activo`);
    }

    const settingsRepo = this.dataSource.getRepository(BusinessSettingsEntity);
    const settings = await settingsRepo.findOne({ where: { businessId: business.id } });
    if (settings && !settings.allowPublicBooking) {
      throw new ForbiddenException('Este negocio no tiene habilitadas las reservas públicas en este momento');
    }

    const createdAppointment = await this.appointmentsService.createManual(
      business.id,
      'public-client',
      {
        serviceId: dto.serviceId,
        resourceId: dto.resourceId,
        branchId: dto.branchId,
        startTime: dto.startTime,
        customerNotes: dto.customer.notes,
        newCustomer: {
          firstName: dto.customer.firstName,
          lastName: dto.customer.lastName,
          email: dto.customer.email,
          phone: dto.customer.phone,
        },
      },
    );

    // Cargar relaciones para respuesta enriquecida
    const appRepo = this.dataSource.getRepository(AppointmentEntity);
    const fullAppointment = await appRepo.findOne({
      where: { id: createdAppointment.id },
      relations: ['service', 'resource', 'branch'],
    });

    const code = `VK-${createdAppointment.id.substring(0, 8).toUpperCase()}`;

    return {
      appointmentId: createdAppointment.id,
      confirmationCode: code,
      status: createdAppointment.status,
      serviceName: fullAppointment?.service?.name,
      resourceName: fullAppointment?.resource?.name || 'Profesional asignado',
      branchName: fullAppointment?.branch?.name,
      startTime: createdAppointment.startTime.toISOString(),
      endTime: createdAppointment.endTime.toISOString(),
      price: createdAppointment.snapshotPrice,
      currency: createdAppointment.snapshotCurrency,
      durationMinutes: createdAppointment.snapshotDurationMinutes,
      customer: {
        firstName: dto.customer.firstName,
        lastName: dto.customer.lastName,
        email: dto.customer.email,
        phone: dto.customer.phone,
      },
    };
  }

  async joinSession(slug: string, sessionId: string, dto: PublicJoinSessionDto) {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const business = await businessRepo.findOne({
      where: { slug },
    });

    if (!business || business.status !== BusinessStatus.ACTIVE) {
      throw new NotFoundException(`El establecimiento '${slug}' no existe o no se encuentra activo`);
    }

    // Asegurar o crear usuario
    let customerUser: UserEntity;
    const userRepo = this.dataSource.getRepository(UserEntity);
    const email = dto.customer.email.toLowerCase().trim();
    const existing = await userRepo.findOne({ where: { email } });

    if (existing) {
      customerUser = existing;
    } else {
      const tempPasswordHash = await argon2.hash(crypto.randomBytes(16).toString('hex'));
      customerUser = await userRepo.save(
        userRepo.create({
          firstName: dto.customer.firstName,
          lastName: dto.customer.lastName,
          email,
          phone: dto.customer.phone,
          passwordHash: tempPasswordHash,
          isActive: true,
        }),
      );
    }

    // Asegurar membresía
    const memRepo = this.dataSource.getRepository(BusinessMembershipEntity);
    const existingMem = await memRepo.findOne({
      where: { businessId: business.id, userId: customerUser.id },
    });
    if (!existingMem) {
      await memRepo.save(
        memRepo.create({
          businessId: business.id,
          userId: customerUser.id,
          role: UserRole.CUSTOMER,
          status: MembershipStatus.ACTIVE,
        }),
      );
    }

    const { session, appointment } = await this.sessionsService.joinSession(
      business.id,
      sessionId,
      customerUser.id,
      { customerNotes: dto.customer.notes },
    );

    const code = `VK-${appointment.id.substring(0, 8).toUpperCase()}`;

    return {
      appointmentId: appointment.id,
      confirmationCode: code,
      status: appointment.status,
      sessionId: session.id,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime.toISOString(),
      currentAttendees: session.currentAttendees,
      maxCapacity: session.maxCapacity,
      customer: {
        firstName: dto.customer.firstName,
        lastName: dto.customer.lastName,
        email: dto.customer.email,
      },
    };
  }
}
