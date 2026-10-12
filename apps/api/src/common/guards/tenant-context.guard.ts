import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BusinessMembershipEntity } from '../../database/entities/business-membership.entity';
import { UserRole, MembershipStatus } from '@voko/shared';

export interface TenantContext {
  businessId: string;
  role: UserRole;
  customPermissions?: Record<string, boolean>;
  isSuperadminOverride?: boolean;
}

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Extraer businessId de params (:businessId) o headers (x-business-id)
    const businessId =
      request.params.businessId ||
      request.headers['x-business-id'] ||
      request.query.businessId;

    if (!businessId) {
      throw new BadRequestException('El identificador del negocio (businessId) es requerido');
    }

    // Superadmin tiene acceso global auditado
    if (user.isSuperadmin) {
      request.tenant = {
        businessId,
        role: UserRole.OWNER,
        isSuperadminOverride: true,
      } as TenantContext;
      return true;
    }

    // Validar membresía del usuario en el negocio
    const membershipRepo = this.dataSource.getRepository(BusinessMembershipEntity);
    const membership = await membershipRepo.findOne({
      where: {
        userId: user.id,
        businessId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Acceso denegado: no posee una membresía activa en el negocio solicitado',
      );
    }

    request.tenant = {
      businessId,
      role: membership.role,
      customPermissions: membership.customPermissions,
    } as TenantContext;

    return true;
  }
}
