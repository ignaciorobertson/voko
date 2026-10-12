import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import {
  CreateBusinessDto,
  UpdateBusinessDto,
  UpdateBusinessSettingsDto,
  UpdateBusinessStatusDto,
} from './dto/business.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@voko/shared';

@ApiTags('businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un nuevo negocio (el usuario creador se asigna como OWNER)' })
  @ApiResponse({ status: 201, description: 'Negocio creado exitosamente' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBusinessDto,
  ) {
    return await this.businessesService.create(userId, dto);
  }

  @Get('my-businesses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar los negocios a los que pertenece el usuario autenticado' })
  async findMyBusinesses(
    @CurrentUser('id') userId: string,
    @CurrentUser('isSuperadmin') isSuperadmin: boolean,
  ) {
    return await this.businessesService.findAllForUser(userId, isSuperadmin);
  }

  @Get(':businessId')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Obtener detalle y estadísticas operativas de un negocio' })
  async findById(@Param('businessId') businessId: string) {
    return await this.businessesService.findById(businessId);
  }

  @Patch(':businessId')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Actualizar datos e identidad visual del negocio (OWNER / ADMIN)' })
  async update(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return await this.businessesService.update(businessId, dto);
  }

  @Get(':businessId/settings')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Consultar configuraciones y reglas del negocio' })
  async getSettings(@Param('businessId') businessId: string) {
    return await this.businessesService.getSettings(businessId);
  }

  @Patch(':businessId/settings')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Actualizar configuraciones y reglas del negocio (OWNER / ADMIN)' })
  async updateSettings(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBusinessSettingsDto,
  ) {
    return await this.businessesService.updateSettings(businessId, dto);
  }

  @Patch(':businessId/status')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @RequireRoles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Modificar estado operativo del negocio (OWNER o Superadmin)' })
  async updateStatus(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBusinessStatusDto,
  ) {
    return await this.businessesService.updateStatus(businessId, dto.status);
  }
}
