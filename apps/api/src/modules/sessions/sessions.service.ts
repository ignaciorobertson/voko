import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SessionEntity } from '../../database/entities/session.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { AppointmentEventEntity } from '../../database/entities/appointment-event.entity';
import { CreateSessionDto, JoinSessionDto, UpdateSessionStatusDto } from './dto/session.dto';
import {
  SessionStatus,
  BookingMode,
  AppointmentStatus,
  AppointmentEventType,
} from '@voko/shared';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async createSession(businessId: string, dto: CreateSessionDto): Promise<SessionEntity> {
    const serviceRepo = this.dataSource.getRepository(ServiceEntity);
    const service = await serviceRepo.findOne({
      where: { id: dto.serviceId, businessId },
    });

    if (!service || !service.isActive) {
      throw new BadRequestException('El servicio no existe o no se encuentra activo');
    }

    if (service.bookingMode !== BookingMode.GROUP_SESSION) {
      throw new BadRequestException(
        `El servicio '${service.name}' está configurado como ${service.bookingMode}, no como GROUP_SESSION`,
      );
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de fin');
    }

    const sessionRepo = this.dataSource.getRepository(SessionEntity);
    const session = sessionRepo.create({
      businessId,
      branchId: dto.branchId,
      serviceId: dto.serviceId,
      resourceId: dto.resourceId,
      startTime: start,
      endTime: end,
      maxCapacity: dto.maxCapacity,
      currentAttendees: 0,
      status: SessionStatus.OPEN,
    });

    const saved = await sessionRepo.save(session);
    this.logger.log(`Sesión grupal ${saved.id} creada para servicio '${service.name}' con cupo de ${dto.maxCapacity}`);
    return saved;
  }

  async joinSession(
    businessId: string,
    sessionId: string,
    customerId: string,
    dto?: JoinSessionDto,
  ): Promise<{ session: SessionEntity; appointment: AppointmentEntity }> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Obtener la sesión con verificación atómica
      const session = await manager.findOne(SessionEntity, {
        where: { id: sessionId, businessId },
      });

      if (!session) {
        throw new NotFoundException('Sesión no encontrada');
      }

      if (session.status === SessionStatus.CANCELLED) {
        throw new BadRequestException('La sesión seleccionada ha sido cancelada');
      }

      // 2. Control estricto de cupo y prevención de overbooking
      if (session.currentAttendees >= session.maxCapacity) {
        session.status = SessionStatus.FULL;
        await manager.save(SessionEntity, session);
        throw new ConflictException(
          'La sesión seleccionada no posee cupos disponibles (capacidad máxima alcanzada)',
        );
      }

      // 3. Comprobar si el usuario ya está inscripto
      const existingEnrollment = await manager
        .createQueryBuilder(AppointmentEntity, 'app')
        .where('app.sessionId = :sessionId', { sessionId })
        .andWhere('app.customerId = :customerId', { customerId })
        .andWhere('app.status NOT IN (:...cancelled)', {
          cancelled: [
            AppointmentStatus.CANCELLED_BY_CUSTOMER,
            AppointmentStatus.CANCELLED_BY_BUSINESS,
          ],
        })
        .getOne();

      if (existingEnrollment) {
        throw new ConflictException('El cliente ya se encuentra inscripto en esta sesión');
      }

      // 4. Incrementar cupo ocupado de forma atómica
      session.currentAttendees += 1;
      if (session.currentAttendees >= session.maxCapacity) {
        session.status = SessionStatus.FULL;
      }
      const updatedSession = await manager.save(SessionEntity, session);

      // 5. Cargar servicio para snapshot
      const service = await manager.findOne(ServiceEntity, {
        where: { id: session.serviceId },
      });

      // 6. Crear cita asociada a la sesión
      const appointment = manager.create(AppointmentEntity, {
        businessId,
        branchId: session.branchId,
        serviceId: session.serviceId,
        resourceId: session.resourceId,
        sessionId: session.id,
        customerId,
        startTime: session.startTime,
        endTime: session.endTime,
        status: AppointmentStatus.CONFIRMED,
        snapshotPrice: service?.price,
        snapshotDurationMinutes: service?.durationMinutes || 60,
        snapshotCurrency: service?.currency || 'ARS',
        customerNotes: dto?.customerNotes,
      });

      const savedAppointment = await manager.save(AppointmentEntity, appointment);

      // 7. Auditoría
      const event = manager.create(AppointmentEventEntity, {
        appointmentId: savedAppointment.id,
        eventType: AppointmentEventType.CREATED,
        newStatus: AppointmentStatus.CONFIRMED,
        actorUserId: customerId,
        metadata: {
          sessionId: session.id,
          attendeeNumber: updatedSession.currentAttendees,
          maxCapacity: session.maxCapacity,
        },
      });
      await manager.save(AppointmentEventEntity, event);

      this.logger.log(
        `Cliente ${customerId} inscripto exitosamente en sesión ${sessionId} (${updatedSession.currentAttendees}/${session.maxCapacity})`,
      );

      return { session: updatedSession, appointment: savedAppointment };
    });
  }

  async leaveSession(
    businessId: string,
    sessionId: string,
    customerId: string,
  ): Promise<SessionEntity> {
    return await this.dataSource.transaction(async (manager) => {
      const session = await manager.findOne(SessionEntity, {
        where: { id: sessionId, businessId },
      });

      if (!session) {
        throw new NotFoundException('Sesión no encontrada');
      }

      const appointment = await manager
        .createQueryBuilder(AppointmentEntity, 'app')
        .where('app.sessionId = :sessionId', { sessionId })
        .andWhere('app.customerId = :customerId', { customerId })
        .andWhere('app.status NOT IN (:...cancelled)', {
          cancelled: [
            AppointmentStatus.CANCELLED_BY_CUSTOMER,
            AppointmentStatus.CANCELLED_BY_BUSINESS,
          ],
        })
        .getOne();

      if (!appointment) {
        throw new NotFoundException('No posee una inscripción activa en esta sesión');
      }

      // Cancelar la cita
      appointment.status = AppointmentStatus.CANCELLED_BY_CUSTOMER;
      appointment.cancelledAt = new Date();
      appointment.cancelledByUserId = customerId;
      await manager.save(AppointmentEntity, appointment);

      // Decrementar asistentes
      session.currentAttendees = Math.max(0, session.currentAttendees - 1);
      if (session.status === SessionStatus.FULL && session.currentAttendees < session.maxCapacity) {
        session.status = SessionStatus.OPEN;
      }
      const updatedSession = await manager.save(SessionEntity, session);

      const event = manager.create(AppointmentEventEntity, {
        appointmentId: appointment.id,
        eventType: AppointmentEventType.CANCELLED,
        previousStatus: AppointmentStatus.CONFIRMED,
        newStatus: AppointmentStatus.CANCELLED_BY_CUSTOMER,
        actorUserId: customerId,
        metadata: { reason: 'Baja voluntaria de sesión grupal' },
      });
      await manager.save(AppointmentEventEntity, event);

      this.logger.log(`Cliente ${customerId} liberó su cupo en sesión ${sessionId}`);
      return updatedSession;
    });
  }

  async updateStatus(
    businessId: string,
    sessionId: string,
    dto: UpdateSessionStatusDto,
  ): Promise<SessionEntity> {
    const repo = this.dataSource.getRepository(SessionEntity);
    const session = await repo.findOne({ where: { id: sessionId, businessId } });
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    session.status = dto.status;
    return await repo.save(session);
  }

  async findByBusiness(
    businessId: string,
    filters?: {
      branchId?: string;
      serviceId?: string;
      status?: SessionStatus;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<SessionEntity[]> {
    const repo = this.dataSource.getRepository(SessionEntity);
    const query = repo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.service', 'service')
      .leftJoinAndSelect('s.branch', 'branch')
      .leftJoinAndSelect('s.resource', 'resource')
      .where('s.businessId = :businessId', { businessId })
      .orderBy('s.startTime', 'ASC');

    if (filters?.branchId) query.andWhere('s.branchId = :branchId', { branchId: filters.branchId });
    if (filters?.serviceId) query.andWhere('s.serviceId = :serviceId', { serviceId: filters.serviceId });
    if (filters?.status) query.andWhere('s.status = :status', { status: filters.status });
    if (filters?.startDate) query.andWhere('s.startTime >= :startDate', { startDate: new Date(filters.startDate) });
    if (filters?.endDate) query.andWhere('s.endTime <= :endDate', { endDate: new Date(filters.endDate) });

    return await query.getMany();
  }

  async findById(businessId: string, sessionId: string): Promise<SessionEntity> {
    const repo = this.dataSource.getRepository(SessionEntity);
    const session = await repo.findOne({
      where: { id: sessionId, businessId },
      relations: ['service', 'branch', 'resource', 'appointments', 'appointments.customer'],
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }
    return session;
  }
}
