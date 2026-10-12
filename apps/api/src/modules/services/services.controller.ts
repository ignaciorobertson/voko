import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto, AssignResourcesDto } from './dto/service.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { UserRole, BookingMode } from '@voko/shared';

@ApiTags('services')
@Controller('businesses/:businessId/services')
@UseGuards(JwtAuthGuard, TenantContextGuard)
@ApiBearerAuth()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'bookingMode', required: false, enum: BookingMode })
  @ApiOperation({ summary: 'Listar servicios del negocio con recursos asignados' })
  async findByBusiness(
    @Param('businessId') businessId: string,
    @Query('isActive') isActive?: string,
    @Query('bookingMode') bookingMode?: BookingMode,
  ) {
    return await this.servicesService.findByBusiness(businessId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      bookingMode,
    });
  }

  @Get(':serviceId')
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'serviceId', description: 'ID del servicio' })
  @ApiOperation({ summary: 'Obtener detalle completo de un servicio' })
  async findById(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return await this.servicesService.findById(businessId, serviceId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Crear un nuevo servicio (OWNER / ADMIN)' })
  @ApiResponse({ status: 201, description: 'Servicio creado exitosamente' })
  async create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateServiceDto,
  ) {
    return await this.servicesService.create(businessId, dto);
  }

  @Patch(':serviceId')
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'serviceId', description: 'ID del servicio' })
  @ApiOperation({ summary: 'Actualizar configuración de un servicio (OWNER / ADMIN)' })
  async update(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return await this.servicesService.update(businessId, serviceId, dto);
  }

  @Post(':serviceId/resources')
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'serviceId', description: 'ID del servicio' })
  @ApiOperation({ summary: 'Asignar recursos habilitados a un servicio' })
  async assignResources(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: AssignResourcesDto,
  ) {
    await this.servicesService.assignResources(businessId, serviceId, dto);
  }
}
