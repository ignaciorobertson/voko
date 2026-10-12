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
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  ManualAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { AppointmentStatus, UserRole } from '@voko/shared';

@ApiTags('appointments')
@Controller('businesses/:businessId/appointments')
@UseGuards(JwtAuthGuard, TenantContextGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'resourceId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: AppointmentStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiOperation({ summary: 'Listar reservas del negocio con filtros' })
  async findByBusiness(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string,
    @Query('resourceId') resourceId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.appointmentsService.findByBusiness(businessId, {
      branchId,
      resourceId,
      customerId,
      status,
      startDate,
      endDate,
    });
  }

  @Get(':appointmentId')
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'appointmentId', description: 'ID de la reserva' })
  @ApiOperation({ summary: 'Obtener detalle y trazabilidad de una reserva' })
  async findById(
    @Param('businessId') businessId: string,
    @Param('appointmentId') appointmentId: string,
  ) {
    return await this.appointmentsService.findById(businessId, appointmentId);
  }

  @Post()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Crear una reserva (turno individual o recurso)' })
  @ApiResponse({ status: 201, description: 'Reserva creada exitosamente' })
  async create(
    @Param('businessId') businessId: string,
    @CurrentUser('id') customerId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return await this.appointmentsService.create(businessId, customerId, dto);
  }

  @Post(':appointmentId/reschedule')
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'appointmentId', description: 'ID de la reserva' })
  @ApiOperation({ summary: 'Reprogramar una reserva conservando la original si falla' })
  async reschedule(
    @Param('businessId') businessId: string,
    @Param('appointmentId') appointmentId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return await this.appointmentsService.reschedule(
      businessId,
      appointmentId,
      actorUserId,
      dto,
      false,
    );
  }

  @Post(':appointmentId/cancel')
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'appointmentId', description: 'ID de la reserva' })
  @ApiOperation({ summary: 'Cancelar una reserva respetando plazo de cancelación' })
  async cancel(
    @Param('businessId') businessId: string,
    @Param('appointmentId') appointmentId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return await this.appointmentsService.cancel(
      businessId,
      appointmentId,
      actorUserId,
      false,
      dto,
    );
  }

  @Patch(':appointmentId/status')
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'appointmentId', description: 'ID de la reserva' })
  @ApiOperation({ summary: 'Actualizar estado operativo del turno (CONFIRMED, COMPLETED, NO_SHOW)' })
  async updateStatus(
    @Param('businessId') businessId: string,
    @Param('appointmentId') appointmentId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return await this.appointmentsService.updateStatus(
      businessId,
      appointmentId,
      actorUserId,
      dto,
    );
  }

  @Post('manual')
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Registro manual de turnos por recepción/administrador' })
  @ApiResponse({ status: 201, description: 'Turno registrado manualmente' })
  async createManual(
    @Param('businessId') businessId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: ManualAppointmentDto,
  ) {
    return await this.appointmentsService.createManual(businessId, actorUserId, dto);
  }
}
