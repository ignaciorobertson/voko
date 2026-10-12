import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { TemplatesService } from './templates.service';
import {
  NotificationQueryDto,
  TestPreviewDto,
} from './dto/notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@voko/shared';

@ApiTags('notifications')
@Controller('businesses/:businessId/notifications')
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly templatesService: TemplatesService,
  ) {}

  @Get()
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Consultar cola de Transactional Outbox y notificaciones del negocio' })
  async findByBusiness(
    @Param('businessId') businessId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return await this.notificationsService.findByBusiness(businessId, query);
  }

  @Get('stats')
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Obtener métricas consolidadas del Transactional Outbox' })
  async getStats(@Param('businessId') businessId: string) {
    return await this.notificationsService.getStats(businessId);
  }

  @Post('dispatch')
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Forzar despacho inmediato de notificaciones pendientes en la cola' })
  async dispatchBatch() {
    return await this.notificationsService.processBatch();
  }

  @Post('dispatch-reminders')
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Escanear turnos de las próximas 24 horas y generar recordatorios en el Outbox' })
  async dispatchReminders(@Param('businessId') businessId: string) {
    return await this.notificationsService.generate24hReminders(businessId);
  }

  @Post(':id/retry')
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'id', description: 'ID de la notificación a reintentar' })
  @ApiOperation({ summary: 'Reintentar manualmente una notificación fallida' })
  async retry(
    @Param('businessId') businessId: string,
    @Param('id') notificationId: string,
  ) {
    return await this.notificationsService.retryNotification(businessId, notificationId);
  }

  @Post('test-preview')
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Generar vista previa interactiva de una plantilla de correo' })
  testPreview(@Body() dto: TestPreviewDto) {
    return this.templatesService.render(dto.eventType, dto.payload);
  }
}
