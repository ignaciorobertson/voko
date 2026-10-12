import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
} from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import {
  CreateAvailabilityRuleDto,
  UpdateAvailabilityRuleDto,
  CreateAvailabilityExceptionDto,
  QueryAvailableSlotsDto,
} from './dto/availability.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@voko/shared';

@ApiTags('availability')
@Controller('businesses/:businessId/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('slots')
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Consultar horarios (slots) disponibles para un servicio y fecha' })
  async getAvailableSlots(
    @Param('businessId') businessId: string,
    @Query() query: QueryAvailableSlotsDto,
  ) {
    return await this.availabilityService.getAvailableSlots(businessId, query);
  }

  @Get('rules')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Listar reglas de horario habitual de un negocio' })
  async getRules(@Param('businessId') businessId: string) {
    return await this.availabilityService.getRulesByBusiness(businessId);
  }

  @Post('rules')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Crear una regla de horario habitual (OWNER / ADMIN)' })
  @ApiResponse({ status: 201, description: 'Regla creada exitosamente' })
  async createRule(
    @Param('businessId') businessId: string,
    @Body() dto: CreateAvailabilityRuleDto,
  ) {
    return await this.availabilityService.createRule(businessId, dto);
  }

  @Patch('rules/:ruleId')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'ruleId', description: 'ID de la regla' })
  @ApiOperation({ summary: 'Actualizar una regla de horario habitual (OWNER / ADMIN)' })
  async updateRule(
    @Param('businessId') businessId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateAvailabilityRuleDto,
  ) {
    return await this.availabilityService.updateRule(businessId, ruleId, dto);
  }

  @Delete('rules/:ruleId')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'ruleId', description: 'ID de la regla' })
  @ApiOperation({ summary: 'Eliminar una regla de horario habitual (OWNER / ADMIN)' })
  async deleteRule(
    @Param('businessId') businessId: string,
    @Param('ruleId') ruleId: string,
  ) {
    await this.availabilityService.deleteRule(businessId, ruleId);
  }

  @Get('exceptions')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Listar excepciones, feriados y bloqueos' })
  async getExceptions(@Param('businessId') businessId: string) {
    return await this.availabilityService.getExceptionsByBusiness(businessId);
  }

  @Post('exceptions')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiOperation({ summary: 'Crear una excepción o feriado (OWNER / ADMIN)' })
  @ApiResponse({ status: 201, description: 'Excepción creada exitosamente' })
  async createException(
    @Param('businessId') businessId: string,
    @Body() dto: CreateAvailabilityExceptionDto,
  ) {
    return await this.availabilityService.createException(businessId, dto);
  }

  @Delete('exceptions/:exceptionId')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'exceptionId', description: 'ID de la excepción' })
  @ApiOperation({ summary: 'Eliminar una excepción o feriado (OWNER / ADMIN)' })
  async deleteException(
    @Param('businessId') businessId: string,
    @Param('exceptionId') exceptionId: string,
  ) {
    await this.availabilityService.deleteException(businessId, exceptionId);
  }
}
