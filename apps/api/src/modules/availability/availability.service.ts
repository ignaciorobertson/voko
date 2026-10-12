import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AvailabilityRuleEntity } from '../../database/entities/availability-rule.entity';
import { AvailabilityExceptionEntity } from '../../database/entities/availability-exception.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { ServiceResourceEntity } from '../../database/entities/service-resource.entity';
import { AppointmentEntity } from '../../database/entities/appointment.entity';
import { BusinessSettingsEntity } from '../../database/entities/business-settings.entity';
import {
  CreateAvailabilityRuleDto,
  UpdateAvailabilityRuleDto,
  CreateAvailabilityExceptionDto,
  QueryAvailableSlotsDto,
} from './dto/availability.dto';
import { AppointmentSlot, ExceptionType, AppointmentStatus } from '@voko/shared';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ==========================================
  // REGLAS HABITUALES (availability_rules)
  // ==========================================

  async getRulesByBusiness(businessId: string): Promise<AvailabilityRuleEntity[]> {
    const repo = this.dataSource.getRepository(AvailabilityRuleEntity);
    return await repo.find({
      where: { businessId },
      relations: ['branch', 'resource'],
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async createRule(businessId: string, dto: CreateAvailabilityRuleDto): Promise<AvailabilityRuleEntity> {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('La hora de inicio (startTime) debe ser anterior a la hora de fin (endTime)');
    }

    const repo = this.dataSource.getRepository(AvailabilityRuleEntity);
    const rule = repo.create({
      businessId,
      branchId: dto.branchId,
      resourceId: dto.resourceId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    return await repo.save(rule);
  }

  async updateRule(businessId: string, ruleId: string, dto: UpdateAvailabilityRuleDto): Promise<AvailabilityRuleEntity> {
    const repo = this.dataSource.getRepository(AvailabilityRuleEntity);
    const rule = await repo.findOne({ where: { id: ruleId, businessId } });
    if (!rule) {
      throw new NotFoundException('Regla de disponibilidad no encontrada');
    }

    const newStart = dto.startTime || rule.startTime;
    const newEnd = dto.endTime || rule.endTime;
    if (newStart >= newEnd) {
      throw new BadRequestException('La hora de inicio debe ser anterior a la hora de fin');
    }

    if (dto.startTime) rule.startTime = dto.startTime;
    if (dto.endTime) rule.endTime = dto.endTime;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;

    return await repo.save(rule);
  }

  async deleteRule(businessId: string, ruleId: string): Promise<void> {
    const repo = this.dataSource.getRepository(AvailabilityRuleEntity);
    const result = await repo.delete({ id: ruleId, businessId });
    if (result.affected === 0) {
      throw new NotFoundException('Regla de disponibilidad no encontrada');
    }
  }

  // ==========================================
  // EXCEPCIONES Y FERIADOS (availability_exceptions)
  // ==========================================

  async getExceptionsByBusiness(businessId: string): Promise<AvailabilityExceptionEntity[]> {
    const repo = this.dataSource.getRepository(AvailabilityExceptionEntity);
    return await repo.find({
      where: { businessId },
      relations: ['branch', 'resource'],
      order: { startTime: 'ASC' },
    });
  }

  async createException(businessId: string, dto: CreateAvailabilityExceptionDto): Promise<AvailabilityExceptionEntity> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) {
      throw new BadRequestException('La fecha/hora de inicio debe ser anterior a la fecha/hora de fin');
    }

    const repo = this.dataSource.getRepository(AvailabilityExceptionEntity);
    const exception = repo.create({
      businessId,
      branchId: dto.branchId,
      resourceId: dto.resourceId,
      startTime: start,
      endTime: end,
      exceptionType: dto.exceptionType,
      reason: dto.reason,
      isBlocking: dto.isBlocking !== undefined ? dto.isBlocking : true,
    });

    return await repo.save(exception);
  }

  async deleteException(businessId: string, exceptionId: string): Promise<void> {
    const repo = this.dataSource.getRepository(AvailabilityExceptionEntity);
    const result = await repo.delete({ id: exceptionId, businessId });
    if (result.affected === 0) {
      throw new NotFoundException('Excepción no encontrada');
    }
  }

  // ==========================================
  // MOTOR DE CÁLCULO DE DISPONIBILIDAD (SLOTS)
  // ==========================================

  async getAvailableSlots(businessId: string, query: QueryAvailableSlotsDto): Promise<AppointmentSlot[]> {
    const serviceRepo = this.dataSource.getRepository(ServiceEntity);
    const resourceRepo = this.dataSource.getRepository(ResourceEntity);
    const srRepo = this.dataSource.getRepository(ServiceResourceEntity);
    const rulesRepo = this.dataSource.getRepository(AvailabilityRuleEntity);
    const excRepo = this.dataSource.getRepository(AvailabilityExceptionEntity);
    const appRepo = this.dataSource.getRepository(AppointmentEntity);
    const settingsRepo = this.dataSource.getRepository(BusinessSettingsEntity);

    // 1. Obtener servicio
    const service = await serviceRepo.findOne({
      where: { id: query.serviceId, businessId },
    });
    if (!service || !service.isActive) {
      throw new NotFoundException('El servicio no existe o no se encuentra activo');
    }

    // 2. Determinar intervalo de slots desde settings (ej. 30 min)
    const settings = await settingsRepo.findOne({ where: { businessId } });
    const slotStepMinutes = settings?.defaultSlotIntervalMinutes || service.durationMinutes;

    // 3. Determinar recursos elegibles
    let eligibleResources: ResourceEntity[] = [];
    if (query.resourceId) {
      const res = await resourceRepo.findOne({
        where: { id: query.resourceId, businessId, isActive: true },
      });
      if (!res) {
        throw new BadRequestException('El recurso solicitado no existe o no está activo');
      }
      eligibleResources = [res];
    } else {
      // Buscar todos los recursos asignados a este servicio
      const serviceResources = await srRepo.find({
        where: { serviceId: service.id },
        relations: ['resource'],
      });
      eligibleResources = serviceResources
        .map((sr) => sr.resource)
        .filter((r): r is ResourceEntity => !!r && r.isActive);

      if (query.branchId) {
        eligibleResources = eligibleResources.filter((r) => r.branchId === query.branchId);
      }
    }

    if (eligibleResources.length === 0) {
      return [];
    }

    // 4. Parsear la fecha solicitada
    // Usamos el día UTC/local seguro YYYY-MM-DD
    const [year, month, day] = query.date.split('-').map(Number);
    const targetDateMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const targetDateNextDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    const dayOfWeek = targetDateMidnight.getUTCDay(); // 0 = Domingo, 1 = Lunes, etc.

    const now = new Date();
    const minNoticeMs = (service.minBookingNoticeMinutes || 0) * 60 * 1000;
    const maxAdvanceMs = (service.maxBookingAdvanceDays || 30) * 24 * 60 * 60 * 1000;

    // 5. Cargar citas ya ocupadas en este día
    const activeAppointments = await appRepo
      .createQueryBuilder('app')
      .where('app.businessId = :businessId', { businessId })
      .andWhere('app.status NOT IN (:...cancelledStatuses)', {
        cancelledStatuses: [
          AppointmentStatus.CANCELLED_BY_CUSTOMER,
          AppointmentStatus.CANCELLED_BY_BUSINESS,
        ],
      })
      .andWhere('app.startTime < :dayEnd AND app.endTime > :dayStart', {
        dayStart: targetDateMidnight,
        dayEnd: targetDateNextDay,
      })
      .getMany();

    // 6. Cargar excepciones que afecten al día
    const exceptions = await excRepo
      .createQueryBuilder('exc')
      .where('exc.businessId = :businessId', { businessId })
      .andWhere('exc.startTime < :dayEnd AND exc.endTime > :dayStart', {
        dayStart: targetDateMidnight,
        dayEnd: targetDateNextDay,
      })
      .getMany();

    const slotsMap = new Map<string, AppointmentSlot>();

    // 7. Iterar por cada recurso elegible
    for (const resource of eligibleResources) {
      // Buscar reglas del recurso para este día
      let rules = await rulesRepo.find({
        where: { businessId, resourceId: resource.id, dayOfWeek, isActive: true },
        order: { startTime: 'ASC' },
      });

      // Si no tiene reglas específicas por recurso, buscar reglas generales de la sucursal o del negocio
      if (rules.length === 0) {
        rules = await rulesRepo.find({
          where: { businessId, dayOfWeek, isActive: true },
          order: { startTime: 'ASC' },
        });
        // Filtrar reglas que sean generales (resourceId nulo)
        rules = rules.filter((r) => !r.resourceId);
      }

      // Convertir reglas horarias a intervalos Date en UTC para este día
      interface TimeInterval {
        start: Date;
        end: Date;
      }

      const workingIntervals: TimeInterval[] = rules.map((r) => {
        const [sH, sM] = r.startTime.split(':').map(Number);
        const [eH, eM] = r.endTime.split(':').map(Number);
        return {
          start: new Date(Date.UTC(year, month - 1, day, sH, sM, 0)),
          end: new Date(Date.UTC(year, month - 1, day, eH, eM, 0)),
        };
      });

      // Incorporar aperturas extraordinarias (isBlocking === false)
      const extraordinaryOpenings = exceptions.filter(
        (ex) => !ex.isBlocking && (!ex.resourceId || ex.resourceId === resource.id),
      );
      for (const extra of extraordinaryOpenings) {
        workingIntervals.push({
          start: new Date(Math.max(extra.startTime.getTime(), targetDateMidnight.getTime())),
          end: new Date(Math.min(extra.endTime.getTime(), targetDateNextDay.getTime())),
        });
      }

      // Filtrar excepciones bloqueantes aplicables a este recurso
      const blockingExceptions = exceptions.filter(
        (ex) => ex.isBlocking && (!ex.resourceId || ex.resourceId === resource.id),
      );

      // Citas de este recurso
      const resourceAppointments = activeAppointments.filter((a) => a.resourceId === resource.id);

      // Generar slots dentro de los intervalos de trabajo
      for (const interval of workingIntervals) {
        let cursor = interval.start.getTime();
        const intervalEnd = interval.end.getTime();

        while (cursor + service.durationMinutes * 60 * 1000 <= intervalEnd) {
          const slotStart = new Date(cursor);
          const slotEnd = new Date(cursor + service.durationMinutes * 60 * 1000);

          // Margen requerido: [slotStart - bufferBefore, slotEnd + bufferAfter]
          const bufferedStart = new Date(slotStart.getTime() - (service.bufferBeforeMinutes || 0) * 60 * 1000);
          const bufferedEnd = new Date(slotEnd.getTime() + (service.bufferAfterMinutes || 0) * 60 * 1000);

          // Validar ventana de anticipación
          const isTooSoon = slotStart.getTime() - now.getTime() < minNoticeMs;
          const isTooFar = slotStart.getTime() - now.getTime() > maxAdvanceMs;

          // Validar bloqueo por excepciones
          const isBlockedByException = blockingExceptions.some((ex) => {
            return !(slotEnd.getTime() <= ex.startTime.getTime() || slotStart.getTime() >= ex.endTime.getTime());
          });

          // Validar colisión con citas existentes
          const isCollidingWithAppointment = resourceAppointments.some((app) => {
            // Se considera colisión si el bloque con margen solapa con la cita
            return !(bufferedEnd.getTime() <= app.startTime.getTime() || bufferedStart.getTime() >= app.endTime.getTime());
          });

          const isAvailable = !isTooSoon && !isTooFar && !isBlockedByException && !isCollidingWithAppointment;

          const slotKey = `${slotStart.toISOString()}_${resource.id}`;
          if (!slotsMap.has(slotKey) && isAvailable) {
            slotsMap.set(slotKey, {
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
              resourceId: resource.id,
              available: true,
            });
          }

          cursor += slotStepMinutes * 60 * 1000;
        }
      }
    }

    return Array.from(slotsMap.values()).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }
}
