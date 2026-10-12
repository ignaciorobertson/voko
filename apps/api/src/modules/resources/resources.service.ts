import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { ResourceEntity } from '../../database/entities/resource.entity';
import { BranchEntity } from '../../database/entities/branch.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { ServiceResourceEntity } from '../../database/entities/service-resource.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';
import { ResourceType } from '@voko/shared';

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(private readonly dataSource: DataSource) {}

  async findByBusiness(
    businessId: string,
    filters?: { branchId?: string; type?: ResourceType; isActive?: boolean },
  ): Promise<any[]> {
    const resourceRepo = this.dataSource.getRepository(ResourceEntity);
    const query = resourceRepo
      .createQueryBuilder('res')
      .leftJoinAndSelect('res.branch', 'branch')
      .leftJoinAndSelect('res.serviceResources', 'sr')
      .leftJoinAndSelect('sr.service', 'service')
      .where('res.businessId = :businessId', { businessId })
      .orderBy('res.name', 'ASC');

    if (filters?.branchId) {
      query.andWhere('res.branchId = :branchId', { branchId: filters.branchId });
    }

    if (filters?.type) {
      query.andWhere('res.resourceType = :type', { type: filters.type });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('res.isActive = :isActive', { isActive: filters.isActive });
    }

    const resources = await query.getMany();

    return resources.map((r) => ({
      ...r,
      branchName: r.branch?.name,
      services: r.serviceResources?.map((sr) => ({
        serviceId: sr.serviceId,
        serviceName: sr.service?.name,
      })) || [],
    }));
  }

  async findById(businessId: string, resourceId: string): Promise<any> {
    const resourceRepo = this.dataSource.getRepository(ResourceEntity);
    const resource = await resourceRepo.findOne({
      where: { id: resourceId, businessId },
      relations: ['branch', 'user', 'serviceResources', 'serviceResources.service'],
    });

    if (!resource) {
      throw new NotFoundException('Recurso no encontrado en el negocio especificado');
    }

    return {
      ...resource,
      branchName: resource.branch?.name,
      user: resource.user
        ? {
            id: resource.user.id,
            firstName: resource.user.firstName,
            lastName: resource.user.lastName,
            email: resource.user.email,
          }
        : undefined,
      services: resource.serviceResources?.map((sr) => ({
        serviceId: sr.serviceId,
        serviceName: sr.service?.name,
      })) || [],
    };
  }

  async create(businessId: string, dto: CreateResourceDto): Promise<ResourceEntity> {
    const branchRepo = this.dataSource.getRepository(BranchEntity);
    const branch = await branchRepo.findOne({
      where: { id: dto.branchId, businessId },
    });
    if (!branch) {
      throw new BadRequestException('La sucursal indicada no existe o no pertenece a este negocio');
    }

    if (dto.userId) {
      const userRepo = this.dataSource.getRepository(UserEntity);
      const user = await userRepo.findOne({ where: { id: dto.userId } });
      if (!user) {
        throw new BadRequestException('El usuario especificado no existe');
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Validar servicios si fueron provistos
      if (dto.serviceIds && dto.serviceIds.length > 0) {
        const serviceRepo = manager.getRepository(ServiceEntity);
        const validServices = await serviceRepo.find({
          where: { id: In(dto.serviceIds), businessId },
        });

        if (validServices.length !== dto.serviceIds.length) {
          throw new BadRequestException(
            'Uno o más servicios especificados no existen o no pertenecen a este negocio',
          );
        }
      }

      // 2. Crear recurso
      const resource = manager.create(ResourceEntity, {
        businessId,
        branchId: dto.branchId,
        userId: dto.userId,
        name: dto.name,
        resourceType: dto.resourceType,
        description: dto.description,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      });

      const savedResource = await manager.save(ResourceEntity, resource);

      // 3. Vincular servicios
      if (dto.serviceIds && dto.serviceIds.length > 0) {
        const srEntities = dto.serviceIds.map((srvId) =>
          manager.create(ServiceResourceEntity, {
            serviceId: srvId,
            resourceId: savedResource.id,
          }),
        );
        await manager.save(ServiceResourceEntity, srEntities);
      }

      this.logger.log(`Recurso '${savedResource.name}' (${savedResource.id}) creado en negocio ${businessId}`);
      return savedResource;
    });
  }

  async update(businessId: string, resourceId: string, dto: UpdateResourceDto): Promise<ResourceEntity> {
    const resourceRepo = this.dataSource.getRepository(ResourceEntity);
    const resource = await resourceRepo.findOne({ where: { id: resourceId, businessId } });
    if (!resource) {
      throw new NotFoundException('Recurso no encontrado en el negocio especificado');
    }

    if (dto.branchId && dto.branchId !== resource.branchId) {
      const branchRepo = this.dataSource.getRepository(BranchEntity);
      const branch = await branchRepo.findOne({
        where: { id: dto.branchId, businessId },
      });
      if (!branch) {
        throw new BadRequestException('La sucursal especificada no pertenece a este negocio');
      }
      resource.branchId = dto.branchId;
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Actualizar servicios vinculados si fueron provistos
      if (dto.serviceIds !== undefined) {
        if (dto.serviceIds.length > 0) {
          const serviceRepo = manager.getRepository(ServiceEntity);
          const validServices = await serviceRepo.find({
            where: { id: In(dto.serviceIds), businessId },
          });

          if (validServices.length !== dto.serviceIds.length) {
            throw new BadRequestException(
              'Uno o más servicios especificados no existen o pertenecen a otro negocio',
            );
          }
        }

        await manager.delete(ServiceResourceEntity, { resourceId });

        if (dto.serviceIds.length > 0) {
          const srEntities = dto.serviceIds.map((srvId) =>
            manager.create(ServiceResourceEntity, {
              serviceId: srvId,
              resourceId,
            }),
          );
          await manager.save(ServiceResourceEntity, srEntities);
        }
      }

      // 2. Actualizar campos
      if (dto.name) resource.name = dto.name;
      if (dto.resourceType) resource.resourceType = dto.resourceType;
      if (dto.description !== undefined) resource.description = dto.description;
      if (dto.userId !== undefined) resource.userId = dto.userId;
      if (dto.isActive !== undefined) resource.isActive = dto.isActive;

      const updated = await manager.save(ResourceEntity, resource);
      this.logger.log(`Recurso ${resourceId} del negocio ${businessId} actualizado`);
      return updated;
    });
  }

  async toggleStatus(businessId: string, resourceId: string, isActive: boolean): Promise<ResourceEntity> {
    const resource = await this.findById(businessId, resourceId);
    const resourceRepo = this.dataSource.getRepository(ResourceEntity);
    resource.isActive = isActive;
    return await resourceRepo.save(resource);
  }
}
