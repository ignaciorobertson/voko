import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { BusinessMembershipEntity } from '../../database/entities/business-membership.entity';
import { AppointmentStatus, UserRole, MembershipStatus } from '@voko/shared';

export interface CustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  totalAppointments: number;
  completedAppointments: number;
  noShowCount: number;
  cancelledCount: number;
  lastAppointmentDate?: Date;
  joinedAt: Date;
  notes?: string;
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly dataSource: DataSource) {}

  async findByBusiness(businessId: string, search?: string): Promise<CustomerSummary[]> {
    const appRepo = this.dataSource.getRepository(AppointmentEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const memRepo = this.dataSource.getRepository(BusinessMembershipEntity);

    // 1. Obtener todos los IDs de clientes vinculados por citas en este negocio
    const appointmentRows = await appRepo
      .createQueryBuilder('app')
      .select('app.customerId', 'customerId')
      .addSelect('COUNT(app.id)', 'total')
      .addSelect(
        `SUM(CASE WHEN app.status = '${AppointmentStatus.COMPLETED}' THEN 1 ELSE 0 END)`,
        'completed',
      )
      .addSelect(
        `SUM(CASE WHEN app.status = '${AppointmentStatus.NO_SHOW}' THEN 1 ELSE 0 END)`,
        'noShow',
      )
      .addSelect(
        `SUM(CASE WHEN app.status IN ('${AppointmentStatus.CANCELLED_BY_CUSTOMER}', '${AppointmentStatus.CANCELLED_BY_BUSINESS}') THEN 1 ELSE 0 END)`,
        'cancelled',
      )
      .addSelect('MAX(app.startTime)', 'lastDate')
      .where('app.businessId = :businessId', { businessId })
      .groupBy('app.customerId')
      .getRawMany();

    // 2. Obtener también clientes registrados explícitamente en el negocio vía membresía
    const memberships = await memRepo.find({
      where: { businessId, role: UserRole.CUSTOMER },
      relations: ['user'],
    });

    const statsMap = new Map<string, any>();
    for (const row of appointmentRows) {
      statsMap.set(row.customerId, {
        total: parseInt(row.total || '0', 10),
        completed: parseInt(row.completed || '0', 10),
        noShow: parseInt(row.noShow || '0', 10),
        cancelled: parseInt(row.cancelled || '0', 10),
        lastDate: row.lastDate ? new Date(row.lastDate) : undefined,
      });
    }

    const customerIds = new Set<string>();
    appointmentRows.forEach((r) => customerIds.add(r.customerId));
    memberships.forEach((m) => customerIds.add(m.userId));

    if (customerIds.size === 0) {
      return [];
    }

    // 3. Buscar entidades de usuario
    const qb = userRepo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: Array.from(customerIds) });

    if (search && search.trim().length > 0) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(u.firstName) LIKE :term OR LOWER(u.lastName) LIKE :term OR LOWER(u.email) LIKE :term OR u.phone LIKE :term)',
        { term },
      );
    }

    const users = await qb.orderBy('u.createdAt', 'DESC').getMany();

    return users.map((u) => {
      const stats = statsMap.get(u.id) || {
        total: 0,
        completed: 0,
        noShow: 0,
        cancelled: 0,
        lastDate: undefined,
      };
      const membership = memberships.find((m) => m.userId === u.id);
      const notes = membership?.customPermissions?.notes as string | undefined;

      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        phone: u.phone,
        totalAppointments: stats.total,
        completedAppointments: stats.completed,
        noShowCount: stats.noShow,
        cancelledCount: stats.cancelled,
        lastAppointmentDate: stats.lastDate,
        joinedAt: membership?.joinedAt || u.createdAt,
        notes,
      };
    });
  }

  async findById(businessId: string, customerId: string) {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const appRepo = this.dataSource.getRepository(AppointmentEntity);
    const memRepo = this.dataSource.getRepository(BusinessMembershipEntity);

    const user = await userRepo.findOne({ where: { id: customerId } });
    if (!user) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const appointments = await appRepo.find({
      where: { businessId, customerId },
      relations: ['service', 'resource', 'branch', 'events'],
      order: { startTime: 'DESC' },
    });

    const membership = await memRepo.findOne({
      where: { businessId, userId: customerId },
    });

    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
    const noShow = appointments.filter((a) => a.status === AppointmentStatus.NO_SHOW).length;
    const cancelled = appointments.filter(
      (a) =>
        a.status === AppointmentStatus.CANCELLED_BY_CUSTOMER ||
        a.status === AppointmentStatus.CANCELLED_BY_BUSINESS,
    ).length;

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: user.phone,
      joinedAt: membership?.joinedAt || user.createdAt,
      notes: (membership?.customPermissions?.notes as string) || '',
      statistics: {
        totalAppointments: total,
        completedAppointments: completed,
        noShowCount: noShow,
        cancelledCount: cancelled,
        attendanceRate: total > 0 ? Math.round((completed / total) * 100) : 100,
      },
      appointments,
    };
  }

  async updateNotes(businessId: string, customerId: string, notes?: string) {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const memRepo = this.dataSource.getRepository(BusinessMembershipEntity);

    const user = await userRepo.findOne({ where: { id: customerId } });
    if (!user) {
      throw new NotFoundException('Cliente no encontrado');
    }

    let membership = await memRepo.findOne({
      where: { businessId, userId: customerId },
    });

    if (!membership) {
      membership = memRepo.create({
        businessId,
        userId: customerId,
        role: UserRole.CUSTOMER,
        status: MembershipStatus.ACTIVE,
        customPermissions: { notes: notes || '' },
      });
    } else {
      membership.customPermissions = {
        ...(membership.customPermissions || {}),
        notes: notes || '',
      };
    }

    await memRepo.save(membership);
    return { success: true, notes: notes || '' };
  }
}
