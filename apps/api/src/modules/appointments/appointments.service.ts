import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { AppointmentEventEntity } from '../../database/entities/appointment-event.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { ServiceResourceEntity } from '../../database/entities/service-resource.entity';
import { AvailabilityExceptionEntity } from '../../database/entities/availability-exception.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { BranchEntity } from '../../database/entities/branch.entity';
import { NotificationEntity } from '../../database/entities/notification.entity';
import { BusinessMembershipEntity } from '../../database/entities/business-membership.entity';
import {
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  ManualAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment.dto';
import {
  AppointmentStatus,
  AppointmentEventType,
  ConfirmationMode,
  UserRole,
  MembershipStatus,
  NotificationChannel,
  NotificationStatus,
} from '@voko/shared';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async create(
    businessId: string,
    customerId: string,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentEntity> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Obtener y validar servicio
      const service = await manager.findOne(ServiceEntity, {
        where: { id: dto.serviceId, businessId },
      });
      if (!service || !service.isActive) {
        throw new BadRequestException('El servicio solicitado no existe o no está activo');
      }

      const startTime = new Date(dto.startTime);
      const now = new Date();

      // 2. Validar anticipación mínima y máxima
      const minNoticeMs = (service.minBookingNoticeMinutes || 0) * 60 * 1000;
      const maxAdvanceMs = (service.maxBookingAdvanceDays || 30) * 24 * 60 * 60 * 1000;

      if (startTime.getTime() - now.getTime() < minNoticeMs) {
        throw new BadRequestException(
          `La reserva no respeta la anticipación mínima requerida (${service.minBookingNoticeMinutes} minutos de antelación)`,
        );
      }

      if (startTime.getTime() - now.getTime() > maxAdvanceMs) {
        throw new BadRequestException(
          `La reserva supera la anticipación máxima permitida (${service.maxBookingAdvanceDays} días de antelación)`,
        );
      }

      // 3. Resolver recurso
      let resourceId = dto.resourceId;
      if (resourceId) {
        const sr = await manager.findOne(ServiceResourceEntity, {
          where: { serviceId: service.id, resourceId },
        });
        if (!sr) {
          throw new BadRequestException('El profesional o recurso indicado no presta este servicio');
        }
      } else {
        // Asignar primer recurso elegible disponible
        const srs = await manager.find(ServiceResourceEntity, {
          where: { serviceId: service.id },
          relations: ['resource'],
        });
        const activeResources = srs
          .map((sr) => sr.resource)
          .filter((r): r is ResourceEntity => !!r && r.isActive);

        if (activeResources.length === 0) {
          throw new BadRequestException('No hay recursos ni profesionales asignados a este servicio');
        }
        resourceId = activeResources[0].id;
      }

      const resource = await manager.findOne(ResourceEntity, {
        where: { id: resourceId },
      });
      if (!resource || !resource.isActive) {
        throw new BadRequestException('El recurso seleccionado no está disponible');
      }

      const branchId = dto.branchId || resource.branchId;
      const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

      // 4. PREVENCIÓN DE DOBLE RESERVA (Anti-Overbooking atómico con buffers)
      const bufferBeforeMs = (service.bufferBeforeMinutes || 0) * 60 * 1000;
      const bufferAfterMs = (service.bufferAfterMinutes || 0) * 60 * 1000;
      const bufferedStart = new Date(startTime.getTime() - bufferBeforeMs);
      const bufferedEnd = new Date(endTime.getTime() + bufferAfterMs);

      // A) Comprobar colisión con otras citas activas
      const conflictingAppointment = await manager
        .createQueryBuilder(AppointmentEntity, 'app')
        .where('app.businessId = :businessId', { businessId })
        .andWhere('app.resourceId = :resourceId', { resourceId })
        .andWhere('app.status NOT IN (:...cancelled)', {
          cancelled: [
            AppointmentStatus.CANCELLED_BY_CUSTOMER,
            AppointmentStatus.CANCELLED_BY_BUSINESS,
          ],
        })
        .andWhere('NOT (app.endTime <= :bufferedStart OR app.startTime >= :bufferedEnd)', {
          bufferedStart,
          bufferedEnd,
        })
        .getOne();

      if (conflictingAppointment) {
        throw new ConflictException(
          'El horario seleccionado ya no se encuentra disponible. Por favor seleccione otro turno.',
        );
      }

      // B) Comprobar excepciones bloqueantes (feriados, descansos, etc.)
      const blockingException = await manager
        .createQueryBuilder(AvailabilityExceptionEntity, 'exc')
        .where('exc.businessId = :businessId', { businessId })
        .andWhere('exc.isBlocking = true')
        .andWhere('(exc.resourceId = :resourceId OR exc.resourceId IS NULL)', { resourceId })
        .andWhere('NOT (exc.endTime <= :startTime OR exc.startTime >= :endTime)', {
          startTime,
          endTime,
        })
        .getOne();

      if (blockingException) {
        throw new ConflictException(
          `El horario solicitado coincide con un bloqueo o feriado: ${blockingException.reason || 'No disponible'}`,
        );
      }

      // 5. Determinar estado inicial
      const initialStatus =
        service.confirmationMode === ConfirmationMode.MANUAL_APPROVAL
          ? AppointmentStatus.PENDING
          : AppointmentStatus.CONFIRMED;

      // 6. Crear cita con snapshots de precio y duración
      const appointment = manager.create(AppointmentEntity, {
        businessId,
        branchId,
        serviceId: service.id,
        resourceId,
        customerId,
        startTime,
        endTime,
        status: initialStatus,
        snapshotPrice: service.price,
        snapshotDurationMinutes: service.durationMinutes,
        snapshotCurrency: service.currency || 'ARS',
        customerNotes: dto.customerNotes,
      });

      const savedAppointment = await manager.save(AppointmentEntity, appointment);

      // 7. Registrar evento de auditoría
      const event = manager.create(AppointmentEventEntity, {
        appointmentId: savedAppointment.id,
        eventType: AppointmentEventType.CREATED,
        newStatus: initialStatus,
        actorUserId: customerId,
        metadata: {
          serviceName: service.name,
          confirmationMode: service.confirmationMode,
        },
      });
      await manager.save(AppointmentEventEntity, event);

      // 8. Transactional Outbox (Hito 9): Registrar notificación desacoplada
      try {
        const customer = await manager.findOne(UserEntity, { where: { id: customerId } });
        const business = await manager.findOne(BusinessEntity, { where: { id: businessId } });
        const branch = await manager.findOne(BranchEntity, { where: { id: branchId } });

        if (customer?.email) {
          const outboxNotif = manager.create(NotificationEntity, {
            businessId,
            recipientUserId: customer.id,
            recipientEmail: customer.email,
            eventType: 'APPOINTMENT_CONFIRMED',
            channel: NotificationChannel.EMAIL,
            status: NotificationStatus.PENDING,
            retryCount: 0,
            payload: {
              appointmentId: savedAppointment.id,
              businessName: business?.name || 'Voko',
              customerName: `${customer.firstName} ${customer.lastName}`,
              serviceName: service.name,
              startTime: savedAppointment.startTime.toISOString(),
              endTime: savedAppointment.endTime.toISOString(),
              branchName: branch?.name || 'Sede Principal',
              branchAddress: branch?.address || '',
              resourceName: resource?.name || 'Profesional Asignado',
              price: savedAppointment.snapshotPrice,
              currency: savedAppointment.snapshotCurrency,
            },
            scheduledAt: new Date(),
          });
          await manager.save(NotificationEntity, outboxNotif);
        }
      } catch (outboxErr: any) {
        this.logger.warn(`Error al insertar notificación en outbox: ${outboxErr.message}`);
      }

      this.logger.log(
        `Turno ${savedAppointment.id} creado exitosamente para cliente ${customerId} en negocio ${businessId}`,
      );

      return savedAppointment;
    });
  }

  async reschedule(
    businessId: string,
    appointmentId: string,
    actorUserId: string,
    dto: RescheduleAppointmentDto,
    isStaffOrAdmin = false,
  ): Promise<AppointmentEntity> {
    return await this.dataSource.transaction(async (manager) => {
      const appointment = await manager.findOne(AppointmentEntity, {
        where: { id: appointmentId, businessId },
        relations: ['service'],
      });

      if (!appointment) {
        throw new NotFoundException('Turno no encontrado');
      }

      if (!isStaffOrAdmin && appointment.customerId !== actorUserId) {
        throw new ForbiddenException('No tiene permisos para modificar la reserva de otra persona');
      }

      if (
        appointment.status === AppointmentStatus.CANCELLED_BY_CUSTOMER ||
        appointment.status === AppointmentStatus.CANCELLED_BY_BUSINESS ||
        appointment.status === AppointmentStatus.COMPLETED
      ) {
        throw new BadRequestException('No se puede reprogramar un turno cancelado o ya completado');
      }

      const now = new Date();
      const service = appointment.service;

      // Comprobar plazo mínimo de cancelación/reprogramación para clientes
      if (!isStaffOrAdmin && service.cancellationDeadlineMinutes > 0) {
        const deadlineMs = service.cancellationDeadlineMinutes * 60 * 1000;
        if (appointment.startTime.getTime() - now.getTime() < deadlineMs) {
          throw new BadRequestException(
            `El plazo para modificar este turno ha expirado (${service.cancellationDeadlineMinutes} minutos de antelación requeridos)`,
          );
        }
      }

      const newStartTime = new Date(dto.newStartTime);
      const newEndTime = new Date(
        newStartTime.getTime() + appointment.snapshotDurationMinutes * 60 * 1000,
      );
      const targetResourceId = dto.newResourceId || appointment.resourceId;

      const bufferBeforeMs = (service.bufferBeforeMinutes || 0) * 60 * 1000;
      const bufferAfterMs = (service.bufferAfterMinutes || 0) * 60 * 1000;
      const bufferedStart = new Date(newStartTime.getTime() - bufferBeforeMs);
      const bufferedEnd = new Date(newEndTime.getTime() + bufferAfterMs);

      // Comprobar conflicto en el nuevo horario
      const conflict = await manager
        .createQueryBuilder(AppointmentEntity, 'app')
        .where('app.businessId = :businessId', { businessId })
        .andWhere('app.resourceId = :resourceId', { resourceId: targetResourceId })
        .andWhere('app.id != :appointmentId', { appointmentId })
        .andWhere('app.status NOT IN (:...cancelled)', {
          cancelled: [
            AppointmentStatus.CANCELLED_BY_CUSTOMER,
            AppointmentStatus.CANCELLED_BY_BUSINESS,
          ],
        })
        .andWhere('NOT (app.endTime <= :bufferedStart OR app.startTime >= :bufferedEnd)', {
          bufferedStart,
          bufferedEnd,
        })
        .getOne();

      if (conflict) {
        throw new ConflictException(
          'El nuevo horario solicitado no se encuentra disponible. Su reserva previa se mantiene intacta.',
        );
      }

      // Actualizar turno
      const previousStartTime = appointment.startTime;
      appointment.startTime = newStartTime;
      appointment.endTime = newEndTime;
      if (targetResourceId) appointment.resourceId = targetResourceId;

      const updated = await manager.save(AppointmentEntity, appointment);

      // Registrar evento de reprogramación
      const event = manager.create(AppointmentEventEntity, {
        appointmentId: updated.id,
        eventType: AppointmentEventType.RESCHEDULED,
        previousStatus: appointment.status,
        newStatus: appointment.status,
        actorUserId,
        metadata: {
          previousStartTime: previousStartTime.toISOString(),
          newStartTime: newStartTime.toISOString(),
        },
      });
      await manager.save(AppointmentEventEntity, event);

      // Transactional Outbox: Notificación de reprogramación
      try {
        const customer = await manager.findOne(UserEntity, { where: { id: appointment.customerId } });
        const business = await manager.findOne(BusinessEntity, { where: { id: businessId } });
        const branch = await manager.findOne(BranchEntity, { where: { id: appointment.branchId } });
        const resource = await manager.findOne(ResourceEntity, { where: { id: appointment.resourceId } });

        if (customer?.email) {
          const outboxNotif = manager.create(NotificationEntity, {
            businessId,
            recipientUserId: customer.id,
            recipientEmail: customer.email,
            eventType: 'APPOINTMENT_RESCHEDULED',
            channel: NotificationChannel.EMAIL,
            status: NotificationStatus.PENDING,
            retryCount: 0,
            payload: {
              appointmentId: updated.id,
              businessName: business?.name || 'Voko',
              customerName: `${customer.firstName} ${customer.lastName}`,
              serviceName: appointment.service?.name || 'Servicio',
              previousStartTime: previousStartTime.toISOString(),
              startTime: newStartTime.toISOString(),
              endTime: newEndTime.toISOString(),
              branchName: branch?.name || 'Sede Principal',
              resourceName: resource?.name || 'Profesional Asignado',
            },
            scheduledAt: new Date(),
          });
          await manager.save(NotificationEntity, outboxNotif);
        }
      } catch (outboxErr: any) {
        this.logger.warn(`Error al insertar notificación de reprogramación: ${outboxErr.message}`);
      }

      this.logger.log(`Turno ${appointmentId} reprogramado a ${newStartTime.toISOString()}`);
      return updated;
    });
  }

  async cancel(
    businessId: string,
    appointmentId: string,
    actorUserId: string,
    isStaffOrAdmin = false,
    dto?: CancelAppointmentDto,
  ): Promise<AppointmentEntity> {
    return await this.dataSource.transaction(async (manager) => {
      const appointment = await manager.findOne(AppointmentEntity, {
        where: { id: appointmentId, businessId },
        relations: ['service'],
      });

      if (!appointment) {
        throw new NotFoundException('Turno no encontrado');
      }

      if (!isStaffOrAdmin && appointment.customerId !== actorUserId) {
        throw new ForbiddenException('No tiene permisos para cancelar la reserva de otra persona');
      }

      if (
        appointment.status === AppointmentStatus.CANCELLED_BY_CUSTOMER ||
        appointment.status === AppointmentStatus.CANCELLED_BY_BUSINESS
      ) {
        throw new BadRequestException('El turno ya se encuentra cancelado');
      }

      const now = new Date();
      const service = appointment.service;

      if (!isStaffOrAdmin && service.cancellationDeadlineMinutes > 0) {
        const deadlineMs = service.cancellationDeadlineMinutes * 60 * 1000;
        if (appointment.startTime.getTime() - now.getTime() < deadlineMs) {
          throw new BadRequestException(
            `El plazo para cancelar este turno ha expirado (${service.cancellationDeadlineMinutes} minutos de antelación requeridos)`,
          );
        }
      }

      const previousStatus = appointment.status;
      const newStatus = isStaffOrAdmin
        ? AppointmentStatus.CANCELLED_BY_BUSINESS
        : AppointmentStatus.CANCELLED_BY_CUSTOMER;

      appointment.status = newStatus;
      appointment.cancelledAt = now;
      appointment.cancellationReason = dto?.reason;
      appointment.cancelledByUserId = actorUserId;

      const updated = await manager.save(AppointmentEntity, appointment);

      // Registrar evento
      const event = manager.create(AppointmentEventEntity, {
        appointmentId: updated.id,
        eventType: AppointmentEventType.CANCELLED,
        previousStatus,
        newStatus,
        actorUserId,
        metadata: {
          reason: dto?.reason,
          cancelledByRole: isStaffOrAdmin ? 'BUSINESS' : 'CUSTOMER',
        },
      });
      await manager.save(AppointmentEventEntity, event);

      // Transactional Outbox: Notificación de cancelación
      try {
        const customer = await manager.findOne(UserEntity, { where: { id: appointment.customerId } });
        const business = await manager.findOne(BusinessEntity, { where: { id: businessId } });

        if (customer?.email) {
          const outboxNotif = manager.create(NotificationEntity, {
            businessId,
            recipientUserId: customer.id,
            recipientEmail: customer.email,
            eventType: 'APPOINTMENT_CANCELLED',
            channel: NotificationChannel.EMAIL,
            status: NotificationStatus.PENDING,
            retryCount: 0,
            payload: {
              appointmentId: updated.id,
              businessName: business?.name || 'Voko',
              customerName: `${customer.firstName} ${customer.lastName}`,
              serviceName: appointment.service?.name || 'Servicio',
              startTime: appointment.startTime.toISOString(),
              reason: dto?.reason || 'Cancelado por solicitud del usuario',
            },
            scheduledAt: new Date(),
          });
          await manager.save(NotificationEntity, outboxNotif);
        }
      } catch (outboxErr: any) {
        this.logger.warn(`Error al insertar notificación de cancelación: ${outboxErr.message}`);
      }

      this.logger.log(`Turno ${appointmentId} cancelado por ${actorUserId}`);
      return updated;
    });
  }

  async updateStatus(
    businessId: string,
    appointmentId: string,
    actorUserId: string,
    dto: UpdateAppointmentStatusDto,
  ): Promise<AppointmentEntity> {
    const repo = this.dataSource.getRepository(AppointmentEntity);
    const eventRepo = this.dataSource.getRepository(AppointmentEventEntity);

    const appointment = await repo.findOne({ where: { id: appointmentId, businessId } });
    if (!appointment) {
      throw new NotFoundException('Turno no encontrado');
    }

    const previousStatus = appointment.status;
    appointment.status = dto.status;
    if (dto.notes) appointment.internalNotes = dto.notes;

    const updated = await repo.save(appointment);

    const event = eventRepo.create({
      appointmentId: updated.id,
      eventType: AppointmentEventType.STATUS_CHANGED,
      previousStatus,
      newStatus: dto.status,
      actorUserId,
      metadata: { notes: dto.notes },
    });
    await eventRepo.save(event);

    return updated;
  }

  async createManual(
    businessId: string,
    actorUserId: string,
    dto: ManualAppointmentDto,
  ): Promise<AppointmentEntity> {
    return await this.dataSource.transaction(async (manager) => {
      let customerId = dto.customerId;

      // Si se envía cliente nuevo al vuelo
      if (!customerId && dto.newCustomer) {
        const userRepo = manager.getRepository(UserEntity);
        const email = dto.newCustomer.email.toLowerCase().trim();
        let user = await userRepo.findOne({ where: { email } });

        if (!user) {
          const tempPasswordHash = await argon2.hash(crypto.randomBytes(16).toString('hex'));
          user = await userRepo.save(
            userRepo.create({
              firstName: dto.newCustomer.firstName,
              lastName: dto.newCustomer.lastName,
              email,
              phone: dto.newCustomer.phone,
              passwordHash: tempPasswordHash,
              isActive: true,
            }),
          );
        }

        // Asegurar membresía como cliente en el negocio
        const memRepo = manager.getRepository(BusinessMembershipEntity);
        const existingMem = await memRepo.findOne({ where: { businessId, userId: user.id } });
        if (!existingMem) {
          await memRepo.save(
            memRepo.create({
              businessId,
              userId: user.id,
              role: UserRole.CUSTOMER,
              status: MembershipStatus.ACTIVE,
            }),
          );
        }

        customerId = user.id;
      }

      if (!customerId) {
        throw new BadRequestException('Debe especificar un customerId o los datos de newCustomer');
      }

      const appointment = await this.create(businessId, customerId, {
        serviceId: dto.serviceId,
        branchId: dto.branchId,
        resourceId: dto.resourceId,
        startTime: dto.startTime,
        customerNotes: dto.customerNotes,
      });

      if (dto.internalNotes) {
        appointment.internalNotes = dto.internalNotes;
        await manager.save(AppointmentEntity, appointment);
      }

      return appointment;
    });
  }

  async findByBusiness(
    businessId: string,
    filters?: {
      branchId?: string;
      resourceId?: string;
      customerId?: string;
      status?: AppointmentStatus;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<AppointmentEntity[]> {
    const repo = this.dataSource.getRepository(AppointmentEntity);
    const query = repo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.service', 'service')
      .leftJoinAndSelect('app.resource', 'resource')
      .leftJoinAndSelect('app.customer', 'customer')
      .leftJoinAndSelect('app.branch', 'branch')
      .where('app.businessId = :businessId', { businessId })
      .orderBy('app.startTime', 'ASC');

    if (filters?.branchId) query.andWhere('app.branchId = :branchId', { branchId: filters.branchId });
    if (filters?.resourceId) query.andWhere('app.resourceId = :resourceId', { resourceId: filters.resourceId });
    if (filters?.customerId) query.andWhere('app.customerId = :customerId', { customerId: filters.customerId });
    if (filters?.status) query.andWhere('app.status = :status', { status: filters.status });
    if (filters?.startDate) query.andWhere('app.startTime >= :startDate', { startDate: new Date(filters.startDate) });
    if (filters?.endDate) query.andWhere('app.endTime <= :endDate', { endDate: new Date(filters.endDate) });

    return await query.getMany();
  }

  async findById(businessId: string, appointmentId: string): Promise<AppointmentEntity> {
    const repo = this.dataSource.getRepository(AppointmentEntity);
    const app = await repo.findOne({
      where: { id: appointmentId, businessId },
      relations: ['service', 'resource', 'customer', 'branch', 'events'],
    });

    if (!app) {
      throw new NotFoundException('Turno no encontrado');
    }
    return app;
  }
}
