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
import { ResourcesService } from './resources.service';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { UserRole, ResourceType } from '@voko/shared';

@ApiTags('resources')
@Controller('businesses/:businessId/resources')
@UseGuards(JwtAuthGuard, TenantContextGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ResourceType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiOperation({ summary: 'Listar recursos del negocio (profesionales, canchas, salas, equipos)' })
  async findByBusiness(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string,
    @Query('type') type?: ResourceType,
    @Query('isActive') isActive?: string,
  ) {
    return await this.resourcesService.findByBusiness(businessId, {
      branchId,
      type,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':resourceId')
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'resourceId', description: 'ID del recurso' })
  @ApiOperation({ summary: 'Obtener detalle completo de un recurso' })
  async findById(
    @Param('businessId') businessId: string,
    @Param('resourceId') resourceId: string,
  ) {
    return await this.resourcesService.findById(businessId, resourceId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Crear un nuevo recurso (OWNER / ADMIN)' })
  @ApiResponse({ status: 201, description: 'Recurso creado exitosamente' })
  async create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateResourceDto,
  ) {
    return await this.resourcesService.create(businessId, dto);
  }

  @Patch(':resourceId')
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'resourceId', description: 'ID del recurso' })
  @ApiOperation({ summary: 'Actualizar datos de un recurso (OWNER / ADMIN)' })
  async update(
    @Param('businessId') businessId: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return await this.resourcesService.update(businessId, resourceId, dto);
  }
}
