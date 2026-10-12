import {
  Controller,
  Get,
  Patch,
  Post,
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
import { CustomerPortalService } from './customer-portal.service';
import {
  UpdateCustomerProfileDto,
  PortalRescheduleAppointmentDto,
  PortalCancelAppointmentDto,
} from './dto/customer-portal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('customer-portal')
@Controller('portal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomerPortalController {
  constructor(private readonly customerPortalService: CustomerPortalService) {}

  @Get('me')
  @ApiOperation({ summary: 'Consultar perfil y estadísticas del cliente autenticado' })
  async getProfile(@CurrentUser('id') userId: string) {
    return await this.customerPortalService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar perfil y datos de contacto del cliente' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return await this.customerPortalService.updateProfile(userId, dto);
  }

  @Get('appointments')
  @ApiQuery({
    name: 'filter',
    required: false,
    enum: ['upcoming', 'past'],
    description: 'Filtrar por próximas reservas o historial',
  })
  @ApiOperation({ summary: 'Listar reservas y turnos del cliente autenticado' })
  async getAppointments(
    @CurrentUser('id') userId: string,
    @Query('filter') filter?: 'upcoming' | 'past',
  ) {
    return await this.customerPortalService.getAppointments(userId, filter);
  }

  @Post('appointments/:appointmentId/cancel')
  @ApiParam({ name: 'appointmentId', description: 'ID de la reserva a cancelar' })
  @ApiOperation({ summary: 'Cancelar reserva desde la cuenta del cliente' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada exitosamente' })
  async cancelAppointment(
    @CurrentUser('id') userId: string,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: PortalCancelAppointmentDto,
  ) {
    return await this.customerPortalService.cancelAppointment(userId, appointmentId, dto);
  }

  @Post('appointments/:appointmentId/reschedule')
  @ApiParam({ name: 'appointmentId', description: 'ID de la reserva a reprogramar' })
  @ApiOperation({ summary: 'Reprogramar fecha/hora de la reserva desde la cuenta del cliente' })
  @ApiResponse({ status: 200, description: 'Reserva reprogramada exitosamente' })
  async rescheduleAppointment(
    @CurrentUser('id') userId: string,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: PortalRescheduleAppointmentDto,
  ) {
    return await this.customerPortalService.rescheduleAppointment(
      userId,
      appointmentId,
      dto,
    );
  }
}
