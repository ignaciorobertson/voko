import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@voko/shared';

@ApiTags('branches')
@Controller('businesses/:businessId/branches')
@UseGuards(JwtAuthGuard, TenantContextGuard)
@ApiBearerAuth()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOperation({ summary: 'Listar sucursales de un negocio' })
  async findByBusiness(
    @Param('businessId') businessId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return await this.branchesService.findByBusiness(
      businessId,
      includeInactive === 'true' || includeInactive === undefined,
    );
  }

  @Get(':branchId')
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'branchId', description: 'ID de la sucursal' })
  @ApiOperation({ summary: 'Obtener detalle de una sucursal' })
  async findById(
    @Param('businessId') businessId: string,
    @Param('branchId') branchId: string,
  ) {
    return await this.branchesService.findById(businessId, branchId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Crear una nueva sucursal (OWNER / ADMIN)' })
  @ApiResponse({ status: 201, description: 'Sucursal creada exitosamente' })
  async create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return await this.branchesService.create(businessId, dto);
  }

  @Patch(':branchId')
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'branchId', description: 'ID de la sucursal' })
  @ApiOperation({ summary: 'Actualizar datos de una sucursal (OWNER / ADMIN)' })
  async update(
    @Param('businessId') businessId: string,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return await this.branchesService.update(businessId, branchId, dto);
  }
}
