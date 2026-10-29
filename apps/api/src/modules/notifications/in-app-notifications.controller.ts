import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { InAppNotificationQueryDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('in-app-notifications')
@Controller('notifications/in-app')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InAppNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar notificaciones internas del usuario autenticado' })
  async getMyNotifications(
    @Req() req: any,
    @Query() query: InAppNotificationQueryDto,
  ) {
    const userId = req.user.id;
    return await this.notificationsService.findInAppNotifications(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Obtener contador de notificaciones no leídas' })
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.id;
    return await this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @ApiParam({ name: 'id', description: 'ID de la notificación interna' })
  @ApiOperation({ summary: 'Marcar una notificación interna como leída' })
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return await this.notificationsService.markInAppNotificationAsRead(id, userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas las notificaciones internas del usuario como leídas' })
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.id;
    return await this.notificationsService.markAllInAppNotificationsAsRead(userId);
  }
}

