import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BranchEntity } from '../../database/entities/branch.entity';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(private readonly dataSource: DataSource) {}

  async findByBusiness(businessId: string, includeInactive = true): Promise<BranchEntity[]> {
    const branchRepo = this.dataSource.getRepository(BranchEntity);
    const where: any = { businessId };
    if (!includeInactive) {
      where.isActive = true;
    }
    return await branchRepo.find({
      where,
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async findById(businessId: string, branchId: string): Promise<BranchEntity> {
    const branchRepo = this.dataSource.getRepository(BranchEntity);
    const branch = await branchRepo.findOne({
      where: { id: branchId, businessId },
    });
    if (!branch) {
      throw new NotFoundException(`Sucursal no encontrada en el negocio especificado`);
    }
    return branch;
  }

  async create(businessId: string, dto: CreateBranchDto): Promise<BranchEntity> {
    const branchRepo = this.dataSource.getRepository(BranchEntity);

    return await this.dataSource.transaction(async (manager) => {
      const existingCount = await manager.count(BranchEntity, { where: { businessId } });
      const shouldBeDefault = dto.isDefault || existingCount === 0;

      if (shouldBeDefault) {
        // Desmarcar default previo
        await manager.update(BranchEntity, { businessId }, { isDefault: false });
      }

      const branch = manager.create(BranchEntity, {
        businessId,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        phone: dto.phone,
        isDefault: shouldBeDefault,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      });

      const saved = await manager.save(BranchEntity, branch);
      this.logger.log(`Sucursal '${saved.name}' (${saved.id}) creada para negocio ${businessId}`);
      return saved;
    });
  }

  async update(businessId: string, branchId: string, dto: UpdateBranchDto): Promise<BranchEntity> {
    const branch = await this.findById(businessId, branchId);

    return await this.dataSource.transaction(async (manager) => {
      if (dto.isDefault === true && !branch.isDefault) {
        await manager.update(BranchEntity, { businessId }, { isDefault: false });
        branch.isDefault = true;
      } else if (dto.isDefault === false && branch.isDefault) {
        throw new BadRequestException('El negocio debe contar con al menos una sucursal predeterminada activa');
      }

      if (dto.isActive === false && branch.isDefault) {
        throw new BadRequestException('No se puede desactivar la sucursal predeterminada del negocio. Asigne otra predeterminada primero.');
      }

      if (dto.name) branch.name = dto.name;
      if (dto.address !== undefined) branch.address = dto.address;
      if (dto.city !== undefined) branch.city = dto.city;
      if (dto.phone !== undefined) branch.phone = dto.phone;
      if (dto.isActive !== undefined) branch.isActive = dto.isActive;

      const updated = await manager.save(BranchEntity, branch);
      this.logger.log(`Sucursal ${branchId} del negocio ${businessId} actualizada`);
      return updated;
    });
  }

  async toggleStatus(businessId: string, branchId: string, isActive: boolean): Promise<BranchEntity> {
    return await this.update(businessId, branchId, { isActive });
  }
}
