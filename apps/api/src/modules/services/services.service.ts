import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { ServiceEntity } from '../../database/entities/service.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { ServiceResourceEntity } from '../../database/entities/service-resource.entity';
import { CreateServiceDto, UpdateServiceDto, AssignResourcesDto } from './dto/service.dto';
import { BookingMode, ConfirmationMode } from '@voko/shared';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(private readonly dataSource: DataSource) {}

  async findByBusiness(
    businessId: string,
    filters?: { isActive?: boolean; bookingMode?: BookingMode },
  ): Promise<any[]> {
    const serviceRepo = this.dataSource.getRepository(ServiceEntity);
    const query = serviceRepo
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.serviceResources', 'sr')
      .leftJoinAndSelect('sr.resource', 'resource')
      .where('service.businessId = :businessId', { businessId })
      .orderBy('service.name', 'ASC');

    if (filters?.isActive !== undefined) {
      query.andWhere('service.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters?.bookingMode) {
      query.andWhere('service.bookingMode = :bookingMode', { bookingMode: filters.bookingMode });
    }

    const services = await query.getMany();

    return services.map((s) => ({
      ...s,
      resources: s.serviceResources?.map((sr) => ({
        resourceId: sr.resourceId,
        resourceName: sr.resource?.name,
        resourceType: sr.resource?.resourceType,
      })) || [],
    }));
  }

  async findById(businessId: string, serviceId: string): Promise<any> {
    const serviceRepo = this.dataSource.getRepository(ServiceEntity);
    const service = await serviceRepo.findOne({
      where: { id: serviceId, businessId },
      relations: ['serviceResources', 'serviceResources.resource', 'serviceResources.resource.branch'],
    });

    if (!service) {
      throw new NotFoundException('Servicio no encontrado en el negocio especificado');
    }

    return {
      ...service,
      resources: service.serviceResources?.map((sr) => ({
        resourceId: sr.resourceId,
        resourceName: sr.resource?.name,
        resourceType: sr.resource?.resourceType,
        branchId: sr.resource?.branchId,
        branchName: sr.resource?.branch?.name,
      })) || [],
    };
  }

  async create(businessId: string, dto: CreateServiceDto): Promise<ServiceEntity> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Validar recursos si fueron provistos
      if (dto.resourceIds && dto.resourceIds.length > 0) {
        const resourceRepo = manager.getRepository(ResourceEntity);
        const validResources = await resourceRepo.find({
          where: { id: In(dto.resourceIds), businessId },
        });

        if (validResources.length !== dto.resourceIds.length) {
          throw new BadRequestException(
            'Uno o más recursos asignados no existen o no pertenecen a este negocio',
          );
        }
      }

      // 2. Crear servicio
      const service = manager.create(ServiceEntity, {
        businessId,
        name: dto.name,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        price: dto.price !== undefined ? dto.price : undefined,
        currency: dto.currency || 'ARS',
        bufferBeforeMinutes: dto.bufferBeforeMinutes ?? 0,
        bufferAfterMinutes: dto.bufferAfterMinutes ?? 0,
        minBookingNoticeMinutes: dto.minBookingNoticeMinutes ?? 60,
        maxBookingAdvanceDays: dto.maxBookingAdvanceDays ?? 30,
        cancellationDeadlineMinutes: dto.cancellationDeadlineMinutes ?? 120,
        bookingMode: dto.bookingMode || BookingMode.INDIVIDUAL,
        confirmationMode: dto.confirmationMode || ConfirmationMode.AUTOMATIC,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      });

      const savedService = await manager.save(ServiceEntity, service);

      // 3. Vincular recursos
      if (dto.resourceIds && dto.resourceIds.length > 0) {
        const srEntities = dto.resourceIds.map((resId) =>
          manager.create(ServiceResourceEntity, {
            serviceId: savedService.id,
            resourceId: resId,
          }),
        );
        await manager.save(ServiceResourceEntity, srEntities);
      }

      this.logger.log(`Servicio '${savedService.name}' (${savedService.id}) creado en negocio ${businessId}`);
      return savedService;
    });
  }

  async update(businessId: string, serviceId: string, dto: UpdateServiceDto): Promise<ServiceEntity> {
    const serviceRepo = this.dataSource.getRepository(ServiceEntity);
    const service = await serviceRepo.findOne({ where: { id: serviceId, businessId } });
    if (!service) {
      throw new NotFoundException('Servicio no encontrado en el negocio especificado');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Validar y actualizar recursos si se enviaron
      if (dto.resourceIds !== undefined) {
        if (dto.resourceIds.length > 0) {
          const resourceRepo = manager.getRepository(ResourceEntity);
          const validResources = await resourceRepo.find({
            where: { id: In(dto.resourceIds), businessId },
          });

          if (validResources.length !== dto.resourceIds.length) {
            throw new BadRequestException(
              'Uno o más recursos asignados no existen o no pertenecen a este negocio',
            );
          }
        }

        // Eliminar asignaciones previas y crear las nuevas
        await manager.delete(ServiceResourceEntity, { serviceId });

        if (dto.resourceIds.length > 0) {
          const srEntities = dto.resourceIds.map((resId) =>
            manager.create(ServiceResourceEntity, {
              serviceId,
              resourceId: resId,
            }),
          );
          await manager.save(ServiceResourceEntity, srEntities);
        }
      }

      // 2. Actualizar campos
      if (dto.name) service.name = dto.name;
      if (dto.description !== undefined) service.description = dto.description;
      if (dto.durationMinutes !== undefined) service.durationMinutes = dto.durationMinutes;
      if (dto.price !== undefined) service.price = dto.price;
      if (dto.currency) service.currency = dto.currency;
      if (dto.bufferBeforeMinutes !== undefined) service.bufferBeforeMinutes = dto.bufferBeforeMinutes;
      if (dto.bufferAfterMinutes !== undefined) service.bufferAfterMinutes = dto.bufferAfterMinutes;
      if (dto.minBookingNoticeMinutes !== undefined) service.minBookingNoticeMinutes = dto.minBookingNoticeMinutes;
      if (dto.maxBookingAdvanceDays !== undefined) service.maxBookingAdvanceDays = dto.maxBookingAdvanceDays;
      if (dto.cancellationDeadlineMinutes !== undefined) service.cancellationDeadlineMinutes = dto.cancellationDeadlineMinutes;
      if (dto.bookingMode) service.bookingMode = dto.bookingMode;
      if (dto.confirmationMode) service.confirmationMode = dto.confirmationMode;
      if (dto.isActive !== undefined) service.isActive = dto.isActive;

      const updated = await manager.save(ServiceEntity, service);
      this.logger.log(`Servicio ${serviceId} del negocio ${businessId} actualizado`);
      return updated;
    });
  }

  async assignResources(
    businessId: string,
    serviceId: string,
    dto: AssignResourcesDto,
  ): Promise<void> {
    await this.findById(businessId, serviceId);

    await this.dataSource.transaction(async (manager) => {
      const resourceRepo = manager.getRepository(ResourceEntity);
      const validResources = await resourceRepo.find({
        where: { id: In(dto.resourceIds), businessId },
      });

      if (validResources.length !== dto.resourceIds.length) {
        throw new BadRequestException(
          'Uno o más recursos asignados no existen o pertenecen a otro negocio',
        );
      }

      await manager.delete(ServiceResourceEntity, { serviceId });

      const srEntities = dto.resourceIds.map((resId) =>
        manager.create(ServiceResourceEntity, {
          serviceId,
          resourceId: resId,
        }),
      );

      await manager.save(ServiceResourceEntity, srEntities);
      this.logger.log(`Recursos asignados al servicio ${serviceId} en negocio ${businessId}`);
    });
  }

  async toggleStatus(businessId: string, serviceId: string, isActive: boolean): Promise<ServiceEntity> {
    const service = await this.findById(businessId, serviceId);
    const serviceRepo = this.dataSource.getRepository(ServiceEntity);
    service.isActive = isActive;
    return await serviceRepo.save(service);
  }
}
