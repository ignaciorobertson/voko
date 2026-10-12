import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@voko/shared';

@ApiTags('reports')
@Controller('businesses/:businessId/reports')
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiOperation({ summary: 'Obtener reporte consolidado de reservas, asistencia, no-shows e ingresos' })
  async getSummary(
    @Param('businessId') businessId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportsService.getSummary(businessId, startDate, endDate);
  }

  @Get('audit')
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'Obtener historial de operaciones y auditoría de turnos (appointment_events)' })
  async getAuditHistory(
    @Param('businessId') businessId: string,
    @Query('limit') limit?: number,
  ) {
    return await this.reportsService.getAuditHistory(businessId, limit ? Number(limit) : 50);
  }
}
