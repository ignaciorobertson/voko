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
import { SessionsService } from './sessions.service';
import {
  CreateSessionDto,
  JoinSessionDto,
  UpdateSessionStatusDto,
} from './dto/session.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { SessionStatus, UserRole } from '@voko/shared';

@ApiTags('sessions')
@Controller('businesses/:businessId/sessions')
@UseGuards(JwtAuthGuard, TenantContextGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: SessionStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiOperation({ summary: 'Listar sesiones grupales programadas' })
  async findByBusiness(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('status') status?: SessionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.sessionsService.findByBusiness(businessId, {
      branchId,
      serviceId,
      status,
      startDate,
      endDate,
    });
  }

  @Get(':sessionId')
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'sessionId', description: 'ID de la sesión' })
  @ApiOperation({ summary: 'Obtener detalle de una sesión grupal con lista de inscriptos' })
  async findById(
    @Param('businessId') businessId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return await this.sessionsService.findById(businessId, sessionId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Crear una nueva sesión grupal con cupo máximo (OWNER / ADMIN / STAFF)' })
  @ApiResponse({ status: 201, description: 'Sesión creada exitosamente' })
  async create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateSessionDto,
  ) {
    return await this.sessionsService.createSession(businessId, dto);
  }

  @Post(':sessionId/join')
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'sessionId', description: 'ID de la sesión' })
  @ApiOperation({ summary: 'Inscribirse a una sesión grupal (control atómico de cupo)' })
  async join(
    @Param('businessId') businessId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') customerId: string,
    @Body() dto: JoinSessionDto,
  ) {
    return await this.sessionsService.joinSession(businessId, sessionId, customerId, dto);
  }

  @Post(':sessionId/leave')
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'sessionId', description: 'ID de la sesión' })
  @ApiOperation({ summary: 'Darse de baja de una sesión grupal (libera cupo)' })
  async leave(
    @Param('businessId') businessId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') customerId: string,
  ) {
    return await this.sessionsService.leaveSession(businessId, sessionId, customerId);
  }

  @Patch(':sessionId/status')
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'sessionId', description: 'ID de la sesión' })
  @ApiOperation({ summary: 'Modificar estado de una sesión (CANCELLED, COMPLETED, FULL)' })
  async updateStatus(
    @Param('businessId') businessId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionStatusDto,
  ) {
    return await this.sessionsService.updateStatus(businessId, sessionId, dto);
  }
}
