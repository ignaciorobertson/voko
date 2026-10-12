import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
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
import { CustomersService } from './customers.service';
import { UpdateCustomerNotesDto, QueryCustomersDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@voko/shared';

@ApiTags('customers')
@Controller('businesses/:businessId/customers')
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por nombre, email o teléfono' })
  @ApiOperation({ summary: 'Listar clientes del negocio con métricas de asistencia' })
  async findByBusiness(
    @Param('businessId') businessId: string,
    @Query() query: QueryCustomersDto,
  ) {
    return await this.customersService.findByBusiness(businessId, query.search);
  }

  @Get(':customerId')
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'customerId', description: 'ID del cliente' })
  @ApiOperation({ summary: 'Consultar ficha completa del cliente, historial y estadísticas' })
  async findById(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
  ) {
    return await this.customersService.findById(businessId, customerId);
  }

  @Patch(':customerId/notes')
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @ApiParam({ name: 'businessId', description: 'ID del negocio' })
  @ApiParam({ name: 'customerId', description: 'ID del cliente' })
  @ApiOperation({ summary: 'Actualizar notas internas y observaciones del cliente' })
  @ApiResponse({ status: 200, description: 'Notas guardadas correctamente' })
  async updateNotes(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerNotesDto,
  ) {
    return await this.customersService.updateNotes(businessId, customerId, dto.notes);
  }
}
