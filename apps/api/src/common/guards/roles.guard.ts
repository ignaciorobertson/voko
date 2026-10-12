import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@voko/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { TenantContext } from './tenant-context.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenant: TenantContext | undefined = request.tenant;

    if (!tenant) {
      throw new ForbiddenException('Contexto de negocio no encontrado para verificar permisos');
    }

    // Si es superadmin override, tiene todos los roles
    if (tenant.isSuperadminOverride) {
      return true;
    }

    const hasRole = requiredRoles.includes(tenant.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Permiso denegado: se requiere uno de los roles [${requiredRoles.join(', ')}] pero su rol es ${tenant.role}`,
      );
    }

    return true;
  }
}
