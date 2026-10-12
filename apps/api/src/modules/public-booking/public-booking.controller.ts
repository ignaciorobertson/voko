import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PublicBookingService } from './public-booking.service';
import { PublicBookAppointmentDto, PublicJoinSessionDto } from './dto/public-booking.dto';

@ApiTags('public-booking')
@Controller('public/businesses')
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  @Get(':slug')
  @ApiParam({ name: 'slug', description: 'Slug público del negocio' })
  @ApiOperation({ summary: 'Obtener información pública, catálogo de servicios, recursos y sesiones de un negocio' })
  @ApiResponse({ status: 200, description: 'Datos del negocio listos para la experiencia de reserva' })
  async getBusiness(@Param('slug') slug: string) {
    return await this.publicBookingService.getPublicBusiness(slug);
  }

  @Get(':slug/slots')
  @ApiParam({ name: 'slug', description: 'Slug público del negocio' })
  @ApiQuery({ name: 'serviceId', required: true, type: String })
  @ApiQuery({ name: 'date', required: true, type: String, example: '2026-11-05' })
  @ApiQuery({ name: 'resourceId', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiOperation({ summary: 'Consultar horarios/slots disponibles para una fecha y servicio específico' })
  async getSlots(
    @Param('slug') slug: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
    @Query('resourceId') resourceId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return await this.publicBookingService.getPublicSlots(slug, {
      serviceId,
      date,
      resourceId,
      branchId,
    });
  }

  @Post(':slug/book')
  @ApiParam({ name: 'slug', description: 'Slug público del negocio' })
  @ApiOperation({ summary: 'Confirmar una reserva individual o de recurso físico (flujo autoservicio)' })
  @ApiResponse({ status: 201, description: 'Reserva procesada exitosamente con código de confirmación' })
  async bookAppointment(
    @Param('slug') slug: string,
    @Body() dto: PublicBookAppointmentDto,
  ) {
    return await this.publicBookingService.bookAppointment(slug, dto);
  }

  @Post(':slug/sessions/:sessionId/join')
  @ApiParam({ name: 'slug', description: 'Slug público del negocio' })
  @ApiParam({ name: 'sessionId', description: 'ID de la sesión grupal' })
  @ApiOperation({ summary: 'Inscribirse en una sesión o clase grupal pública' })
  @ApiResponse({ status: 201, description: 'Inscripción confirmada con cupo reservado' })
  async joinSession(
    @Param('slug') slug: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: PublicJoinSessionDto,
  ) {
    return await this.publicBookingService.joinSession(slug, sessionId, dto);
  }
}
