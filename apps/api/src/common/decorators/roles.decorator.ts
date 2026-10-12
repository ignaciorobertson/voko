import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@voko/shared';

export const ROLES_KEY = 'roles';
export const RequireRoles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
