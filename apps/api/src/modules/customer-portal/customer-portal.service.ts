import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DataSource, MoreThanOrEqual, LessThan } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import {
  UpdateCustomerProfileDto,
  PortalRescheduleAppointmentDto,
  PortalCancelAppointmentDto,
} from './dto/customer-portal.dto';
import { AppointmentStatus } from '@voko/shared';

@Injectable()
export class CustomerPortalService {
  private readonly logger = new Logger(CustomerPortalService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  async getProfile(userId: string) {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const appRepo = this.dataSource.getRepository(AppointmentEntity);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Perfil de usuario no encontrado');
    }

    const now = new Date();
    const upcomingCount = await appRepo.count({
      where: {
        customerId: userId,
        startTime: MoreThanOrEqual(now),
        status: AppointmentStatus.CONFIRMED,
      },
    });

    const completedCount = await appRepo.count({
      where: {
        customerId: userId,
        status: AppointmentStatus.COMPLETED,
      },
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: user.phone,
      emailVerified: !!user.emailVerifiedAt,
      createdAt: user.createdAt,
      stats: {
        upcomingCount,
        completedCount,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone.trim();

    await userRepo.save(user);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: user.phone,
    };
  }

  async getAppointments(userId: string, filter?: 'upcoming' | 'past') {
    const appRepo = this.dataSource.getRepository(AppointmentEntity);
    const now = new Date();

    const qb = appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.service', 'service')
      .leftJoinAndSelect('app.resource', 'resource')
      .leftJoinAndSelect('app.branch', 'branch')
      .leftJoinAndSelect('app.business', 'business')
      .where('app.customerId = :userId', { userId });

    if (filter === 'upcoming') {
      qb.andWhere('app.startTime >= :now', { now })
        .andWhere('app.status NOT IN (:...excludedStatuses)', {
          excludedStatuses: [
            AppointmentStatus.CANCELLED_BY_CUSTOMER,
            AppointmentStatus.CANCELLED_BY_BUSINESS,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
          ],
        })
        .orderBy('app.startTime', 'ASC');
    } else if (filter === 'past') {
      qb.andWhere(
        '(app.startTime < :now OR app.status IN (:...pastStatuses))',
        {
          now,
          pastStatuses: [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
            AppointmentStatus.CANCELLED_BY_CUSTOMER,
            AppointmentStatus.CANCELLED_BY_BUSINESS,
          ],
        },
      ).orderBy('app.startTime', 'DESC');
    } else {
      qb.orderBy('app.startTime', 'DESC');
    }

    const appointments = await qb.getMany();

    return appointments.map((app) => ({
      id: app.id,
      businessId: app.businessId,
      businessName: app.business?.name || 'Voko Business',
      businessSlug: app.business?.slug || '',
      serviceId: app.serviceId,
      serviceName: app.service?.name || 'Servicio',
      resourceName: app.resource?.name || 'Cualquiera disponible',
      branchName: app.branch?.name || 'Sede Central',
      branchAddress: app.branch?.address,
      startTime: app.startTime,
      endTime: app.endTime,
      status: app.status,
      snapshotPrice: app.snapshotPrice,
      snapshotCurrency: app.snapshotCurrency,
      snapshotDurationMinutes: app.snapshotDurationMinutes,
      customerNotes: app.customerNotes,
      cancellationDeadlineMinutes: app.service?.cancellationDeadlineMinutes || 0,
      canCancelOrReschedule:
        (app.status === AppointmentStatus.PENDING ||
          app.status === AppointmentStatus.CONFIRMED) &&
        new Date(app.startTime).getTime() -
          Date.now() >
          (app.service?.cancellationDeadlineMinutes || 0) * 60 * 1000,
    }));
  }

  async cancelAppointment(
    userId: string,
    appointmentId: string,
    dto: PortalCancelAppointmentDto,
  ) {
    const appRepo = this.dataSource.getRepository(AppointmentEntity);
    const appointment = await appRepo.findOne({ where: { id: appointmentId } });

    if (!appointment) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return await this.appointmentsService.cancel(
      appointment.businessId,
      appointmentId,
      userId,
      false,
      { reason: dto.reason },
    );
  }

  async rescheduleAppointment(
    userId: string,
    appointmentId: string,
    dto: PortalRescheduleAppointmentDto,
  ) {
    const appRepo = this.dataSource.getRepository(AppointmentEntity);
    const appointment = await appRepo.findOne({ where: { id: appointmentId } });

    if (!appointment) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return await this.appointmentsService.reschedule(
      appointment.businessId,
      appointmentId,
      userId,
      {
        newStartTime: dto.startTime,
        newResourceId: dto.resourceId,
      },
      false,
    );
  }
}
