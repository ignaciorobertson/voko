import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperadminGuard } from '../../common/guards/superadmin.guard';
import { SuperadminService } from './superadmin.service';
import {
  CreateBusinessSuperadminDto,
  UpdateBusinessStatusDto,
  AssignBusinessAdminDto,
  SuperadminQueryDto,
} from './dto/superadmin.dto';

@ApiTags('Operación Global y Superadministrador')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperadminGuard)
@Controller('superadmin')
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Obtener métricas y KPIs globales de la plataforma' })
  async getOverview() {
    return this.superadminService.getGlobalMetrics();
  }

  @Get('businesses')
  @ApiOperation({ summary: 'Listar todos los negocios con filtros y métricas' })
  async listBusinesses(@Query() query: SuperadminQueryDto) {
    return this.superadminService.listBusinesses(query);
  }

  @Get('businesses/:businessId')
  @ApiOperation({ summary: 'Obtener ficha técnica de soporte de un negocio' })
  async getBusinessDetails(@Param('businessId') businessId: string) {
    return this.superadminService.getBusinessDetails(businessId);
  }

  @Post('businesses')
  @ApiOperation({ summary: 'Crear un nuevo negocio con propietario inicial' })
  async createBusiness(@Body() dto: CreateBusinessSuperadminDto, @Req() req: any) {
    const superadminId = req.user.id;
    return this.superadminService.createBusiness(dto, superadminId);
  }

  @Patch('businesses/:businessId/status')
  @ApiOperation({ summary: 'Suspender, reactivar o modificar estado de un negocio' })
  async updateBusinessStatus(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBusinessStatusDto,
    @Req() req: any,
  ) {
    const superadminId = req.user.id;
    return this.superadminService.updateBusinessStatus(businessId, dto, superadminId);
  }

  @Post('businesses/:businessId/admins')
  @ApiOperation({ summary: 'Asignar o invitar un administrador/propietario a un negocio' })
  async assignAdmin(
    @Param('businessId') businessId: string,
    @Body() dto: AssignBusinessAdminDto,
    @Req() req: any,
  ) {
    const superadminId = req.user.id;
    return this.superadminService.assignAdmin(businessId, dto, superadminId);
  }

  @Get('users')
  @ApiOperation({ summary: 'Directorio global de usuarios registrados' })
  async listUsers(@Query('search') search?: string) {
    return this.superadminService.listUsers(search);
  }

  @Patch('users/:userId/toggle-superadmin')
  @ApiOperation({ summary: 'Conceder o revocar privilegios de Superadministrador' })
  async toggleUserSuperadmin(@Param('userId') userId: string, @Req() req: any) {
    const superadminId = req.user.id;
    return this.superadminService.toggleUserSuperadmin(userId, superadminId);
  }

  @Get('audit')
  @ApiOperation({ summary: 'Consultar logs de auditoría global de la plataforma' })
  async getAuditLogs(@Query('limit') limit?: number) {
    const parsedLimit = limit ? Number(limit) : 50;
    return this.superadminService.getAuditLogs(parsedLimit);
  }
}
