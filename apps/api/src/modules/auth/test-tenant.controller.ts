import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard, TenantContext } from '../../common/guards/tenant-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@voko/shared';
import { Req } from '@nestjs/common';
import { Request } from 'express';

@ApiTags('Pruebas de Aislamiento y Roles Multi-Tenant')
@Controller('business/:businessId')
@UseGuards(JwtAuthGuard, TenantContextGuard)
@ApiBearerAuth()
export class TestTenantController {
  @Get('ping')
  @ApiOperation({ summary: 'Verificar acceso a negocio según membresía activa' })
  ping(
    @Param('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const tenant: TenantContext = (req as any).tenant;
    return {
      message: 'Acceso autorizado al contexto del negocio',
      businessId,
      user: { id: user.id, email: user.email },
      membership: {
        role: tenant.role,
        isSuperadminOverride: !!tenant.isSuperadminOverride,
      },
    };
  }

  @Get('admin-only')
  @UseGuards(RolesGuard)
  @RequireRoles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Acceso restringido solo a administradores o propietarios' })
  adminOnly(
    @Param('businessId') businessId: string,
    @Req() req: Request,
  ) {
    const tenant: TenantContext = (req as any).tenant;
    return {
      message: 'Acceso concedido al panel administrativo del negocio',
      businessId,
      role: tenant.role,
    };
  }
}
