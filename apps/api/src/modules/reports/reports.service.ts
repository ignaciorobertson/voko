import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { AppointmentEventEntity } from '../../database/entities/appointment-event.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AppointmentStatus } from '@voko/shared';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async getSummary(businessId: string, startDate?: string, endDate?: string) {
    const appRepo = this.dataSource.getRepository(AppointmentEntity);

    const qb = appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.service', 'service')
      .leftJoinAndSelect('app.resource', 'resource')
      .where('app.businessId = :businessId', { businessId });

    if (startDate) {
      qb.andWhere('app.startTime >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      qb.andWhere('app.startTime <= :endDate', { endDate: new Date(endDate) });
    }

    const appointments = await qb.getMany();

    const total = appointments.length;

    // Conteo por estados
    const byStatus = {
      [AppointmentStatus.PENDING]: 0,
      [AppointmentStatus.CONFIRMED]: 0,
      [AppointmentStatus.COMPLETED]: 0,
      [AppointmentStatus.NO_SHOW]: 0,
      [AppointmentStatus.CANCELLED_BY_CUSTOMER]: 0,
      [AppointmentStatus.CANCELLED_BY_BUSINESS]: 0,
    };

    let realizedRevenue = 0;
    let projectedRevenue = 0;

    const serviceStats = new Map<
      string,
      { name: string; count: number; revenue: number }
    >();
    const resourceStats = new Map<
      string,
      { name: string; count: number; completed: number; minutes: number }
    >();

    for (const app of appointments) {
      const statusKey = app.status in byStatus ? app.status : AppointmentStatus.CONFIRMED;
      byStatus[statusKey] = (byStatus[statusKey] || 0) + 1;

      const price = Number(app.snapshotPrice || 0);

      if (app.status === AppointmentStatus.COMPLETED) {
        realizedRevenue += price;
      } else if (
        app.status === AppointmentStatus.CONFIRMED ||
        app.status === AppointmentStatus.PENDING
      ) {
        projectedRevenue += price;
      }

      // Desglose de servicios
      const sId = app.serviceId;
      const sName = app.service?.name || 'Servicio General';
      const curService = serviceStats.get(sId) || { name: sName, count: 0, revenue: 0 };
      curService.count += 1;
      if (app.status === AppointmentStatus.COMPLETED) {
        curService.revenue += price;
      }
      serviceStats.set(sId, curService);

      // Desglose de recursos / profesionales
      if (app.resourceId) {
        const rId = app.resourceId;
        const rName = app.resource?.name || 'Recurso General';
        const curResource = resourceStats.get(rId) || {
          name: rName,
          count: 0,
          completed: 0,
          minutes: 0,
        };
        curResource.count += 1;
        if (app.status === AppointmentStatus.COMPLETED) {
          curResource.completed += 1;
          curResource.minutes += app.snapshotDurationMinutes || 0;
        }
        resourceStats.set(rId, curResource);
      }
    }

    const completedTotal = byStatus[AppointmentStatus.COMPLETED];
    const noShowTotal = byStatus[AppointmentStatus.NO_SHOW];
    const cancelledTotal =
      byStatus[AppointmentStatus.CANCELLED_BY_CUSTOMER] +
      byStatus[AppointmentStatus.CANCELLED_BY_BUSINESS];

    const resolvedTotal = completedTotal + noShowTotal + cancelledTotal;

    const attendanceRate =
      resolvedTotal > 0 ? Math.round((completedTotal / resolvedTotal) * 100) : 100;
    const noShowRate =
      resolvedTotal > 0 ? Math.round((noShowTotal / resolvedTotal) * 100) : 0;
    const cancellationRate =
      total > 0 ? Math.round((cancelledTotal / total) * 100) : 0;

    const topServices = Array.from(serviceStats.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const resourcePerformance = Array.from(resourceStats.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalAppointments: data.count,
        completedAppointments: data.completed,
        hoursWorked: Number((data.minutes / 60).toFixed(1)),
      }))
      .sort((a, b) => b.completedAppointments - a.completedAppointments);

    return {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      metrics: {
        totalAppointments: total,
        completedAppointments: completedTotal,
        noShowAppointments: noShowTotal,
        cancelledAppointments: cancelledTotal,
        pendingAppointments: byStatus[AppointmentStatus.PENDING],
        confirmedAppointments: byStatus[AppointmentStatus.CONFIRMED],
        attendanceRate,
        noShowRate,
        cancellationRate,
        realizedRevenue,
        projectedRevenue,
        currency: 'ARS',
      },
      byStatus,
      topServices,
      resourcePerformance,
    };
  }

  async getAuditHistory(businessId: string, limit = 50) {
    const eventRepo = this.dataSource.getRepository(AppointmentEventEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);

    const events = await eventRepo
      .createQueryBuilder('ev')
      .innerJoinAndSelect('ev.appointment', 'app')
      .leftJoinAndSelect('app.service', 'service')
      .leftJoinAndSelect('app.resource', 'resource')
      .leftJoinAndSelect('app.customer', 'customer')
      .where('app.businessId = :businessId', { businessId })
      .orderBy('ev.createdAt', 'DESC')
      .take(limit)
      .getMany();

    const actorIds = Array.from(
      new Set(events.map((e) => e.actorUserId).filter(Boolean)),
    ) as string[];

    let actorsMap = new Map<string, string>();
    if (actorIds.length > 0) {
      const actors = await userRepo.findByIds(actorIds);
      actorsMap = new Map(
        actors.map((a) => [a.id, `${a.firstName} ${a.lastName}`.trim()]),
      );
    }

    return events.map((e) => ({
      id: e.id,
      appointmentId: e.appointmentId,
      eventType: e.eventType,
      previousStatus: e.previousStatus,
      newStatus: e.newStatus,
      actorUserId: e.actorUserId,
      actorName: e.actorUserId
        ? actorsMap.get(e.actorUserId) || 'Sistema / Recepción'
        : 'Sistema',
      serviceName: e.appointment?.service?.name || 'Servicio',
      customerName: e.appointment?.customer
        ? `${e.appointment.customer.firstName} ${e.appointment.customer.lastName}`.trim()
        : 'Cliente',
      appointmentTime: e.appointment?.startTime,
      metadata: e.metadata,
      createdAt: e.createdAt,
    }));
  }
}
