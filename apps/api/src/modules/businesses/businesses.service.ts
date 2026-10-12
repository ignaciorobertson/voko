import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BusinessEntity } from '../../database/entities/business.entity';
import { BranchEntity } from '../../database/entities/branch.entity';
import { BusinessSettingsEntity } from '../../database/entities/business-settings.entity';
import { BusinessMembershipEntity } from '../../database/entities/business-membership.entity';
import { ServiceEntity } from '../../database/entities/service.entity';
import { ResourceEntity } from '../../database/entities/resource.entity';
import {
  CreateBusinessDto,
  UpdateBusinessDto,
  UpdateBusinessSettingsDto,
} from './dto/business.dto';
import {
  UserRole,
  MembershipStatus,
  BusinessStatus,
} from '@voko/shared';
import * as crypto from 'crypto';

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(private readonly dataSource: DataSource) {}

  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    return `${baseSlug || 'negocio'}-${randomSuffix}`;
  }

  async create(userId: string, dto: CreateBusinessDto): Promise<BusinessEntity> {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);

    let slug = dto.slug;
    if (!slug) {
      slug = this.generateSlug(dto.name);
    } else {
      const existing = await businessRepo.findOne({ where: { slug } });
      if (existing) {
        throw new ConflictException(`El slug '${slug}' ya está en uso por otro negocio`);
      }
    }

    // Ejecutar creación atómica en transacción
    return await this.dataSource.transaction(async (manager) => {
      // 1. Crear entidad del negocio
      const business = manager.create(BusinessEntity, {
        name: dto.name,
        slug,
        description: dto.description,
        industry: dto.industry,
        contactEmail: dto.contactEmail.toLowerCase().trim(),
        phone: dto.phone,
        taxId: dto.taxId,
        timezone: dto.timezone || 'America/Argentina/Buenos_Aires',
        currency: dto.currency || 'ARS',
        logoUrl: dto.logoUrl,
        status: BusinessStatus.ACTIVE,
      });
      const savedBusiness = await manager.save(BusinessEntity, business);

      // 2. Crear sucursal principal por defecto
      const defaultBranch = manager.create(BranchEntity, {
        businessId: savedBusiness.id,
        name: 'Sucursal Principal',
        phone: dto.phone,
        isDefault: true,
        isActive: true,
      });
      await manager.save(BranchEntity, defaultBranch);

      // 3. Crear configuraciones y tokens de identidad visual
      const settings = manager.create(BusinessSettingsEntity, {
        businessId: savedBusiness.id,
        allowPublicBooking: true,
        requireEmailVerification: false,
        defaultSlotIntervalMinutes: 30,
        brandPrimaryColor: dto.primaryColor || '#1E40AF',
        brandSecondaryColor: dto.secondaryColor || '#38BDF8',
      });
      await manager.save(BusinessSettingsEntity, settings);

      // 4. Asignar al creador como OWNER en business_memberships
      const membership = manager.create(BusinessMembershipEntity, {
        businessId: savedBusiness.id,
        userId,
        role: UserRole.OWNER,
        status: MembershipStatus.ACTIVE,
      });
      await manager.save(BusinessMembershipEntity, membership);

      this.logger.log(`Negocio '${savedBusiness.name}' (${savedBusiness.id}) creado exitosamente por usuario ${userId}`);

      return {
        ...savedBusiness,
        branches: [defaultBranch],
        settings,
      } as BusinessEntity;
    });
  }

  async findAllForUser(userId: string, isSuperadmin = false): Promise<any[]> {
    const membershipRepo = this.dataSource.getRepository(BusinessMembershipEntity);
    const businessRepo = this.dataSource.getRepository(BusinessEntity);

    if (isSuperadmin) {
      const allBusinesses = await businessRepo.find({
        relations: ['branches', 'settings'],
        order: { createdAt: 'DESC' },
      });
      return allBusinesses.map((b) => ({
        ...b,
        userRole: UserRole.OWNER,
        isSuperadminView: true,
      }));
    }

    const memberships = await membershipRepo.find({
      where: { userId, status: MembershipStatus.ACTIVE },
      relations: ['business', 'business.branches', 'business.settings'],
      order: { createdAt: 'DESC' },
    });

    return memberships.map((m) => ({
      ...m.business,
      userRole: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async findById(businessId: string): Promise<any> {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const serviceRepo = this.dataSource.getRepository(ServiceEntity);
    const resourceRepo = this.dataSource.getRepository(ResourceEntity);

    const business = await businessRepo.findOne({
      where: { id: businessId },
      relations: ['branches', 'settings'],
    });

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    const [servicesCount, resourcesCount] = await Promise.all([
      serviceRepo.count({ where: { businessId, isActive: true } }),
      resourceRepo.count({ where: { businessId, isActive: true } }),
    ]);

    return {
      ...business,
      stats: {
        activeServicesCount: servicesCount,
        activeResourcesCount: resourcesCount,
        branchesCount: business.branches?.length || 0,
      },
    };
  }

  async update(businessId: string, dto: UpdateBusinessDto): Promise<BusinessEntity> {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const settingsRepo = this.dataSource.getRepository(BusinessSettingsEntity);

    const business = await businessRepo.findOne({
      where: { id: businessId },
      relations: ['settings', 'branches'],
    });

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    if (dto.slug && dto.slug !== business.slug) {
      const existing = await businessRepo.findOne({ where: { slug: dto.slug } });
      if (existing && existing.id !== businessId) {
        throw new ConflictException(`El slug '${dto.slug}' ya está en uso por otro negocio`);
      }
      business.slug = dto.slug;
    }

    if (dto.name) business.name = dto.name;
    if (dto.description !== undefined) business.description = dto.description;
    if (dto.industry !== undefined) business.industry = dto.industry;
    if (dto.contactEmail) business.contactEmail = dto.contactEmail.toLowerCase().trim();
    if (dto.phone !== undefined) business.phone = dto.phone;
    if (dto.taxId !== undefined) business.taxId = dto.taxId;
    if (dto.timezone) business.timezone = dto.timezone;
    if (dto.currency) business.currency = dto.currency;
    if (dto.logoUrl !== undefined) business.logoUrl = dto.logoUrl;

    await businessRepo.save(business);

    // Actualizar tokens de identidad visual en settings si fueron provistos
    if (dto.primaryColor || dto.secondaryColor) {
      let settings = await settingsRepo.findOne({ where: { businessId } });
      if (!settings) {
        settings = settingsRepo.create({ businessId });
      }
      if (dto.primaryColor) settings.brandPrimaryColor = dto.primaryColor;
      if (dto.secondaryColor) settings.brandSecondaryColor = dto.secondaryColor;
      await settingsRepo.save(settings);
      business.settings = settings;
    }

    this.logger.log(`Negocio ${businessId} actualizado exitosamente`);
    return business;
  }

  async getSettings(businessId: string): Promise<BusinessSettingsEntity> {
    const settingsRepo = this.dataSource.getRepository(BusinessSettingsEntity);
    let settings = await settingsRepo.findOne({ where: { businessId } });
    if (!settings) {
      settings = await settingsRepo.save(
        settingsRepo.create({
          businessId,
          allowPublicBooking: true,
          requireEmailVerification: false,
          defaultSlotIntervalMinutes: 30,
          brandPrimaryColor: '#1E40AF',
          brandSecondaryColor: '#38BDF8',
        }),
      );
    }
    return settings;
  }

  async updateSettings(
    businessId: string,
    dto: UpdateBusinessSettingsDto,
  ): Promise<BusinessSettingsEntity> {
    const settings = await this.getSettings(businessId);
    const settingsRepo = this.dataSource.getRepository(BusinessSettingsEntity);

    if (dto.allowPublicBooking !== undefined) settings.allowPublicBooking = dto.allowPublicBooking;
    if (dto.requireEmailVerification !== undefined) settings.requireEmailVerification = dto.requireEmailVerification;
    if (dto.defaultSlotIntervalMinutes !== undefined) settings.defaultSlotIntervalMinutes = dto.defaultSlotIntervalMinutes;
    if (dto.brandPrimaryColor) settings.brandPrimaryColor = dto.brandPrimaryColor;
    if (dto.brandSecondaryColor) settings.brandSecondaryColor = dto.brandSecondaryColor;
    if (dto.customNotificationConfig !== undefined) settings.customNotificationConfig = dto.customNotificationConfig;

    return await settingsRepo.save(settings);
  }

  async updateStatus(businessId: string, status: BusinessStatus): Promise<BusinessEntity> {
    const businessRepo = this.dataSource.getRepository(BusinessEntity);
    const business = await businessRepo.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    business.status = status;
    await businessRepo.save(business);
    this.logger.log(`Estado del negocio ${businessId} cambiado a ${status}`);
    return business;
  }
}
