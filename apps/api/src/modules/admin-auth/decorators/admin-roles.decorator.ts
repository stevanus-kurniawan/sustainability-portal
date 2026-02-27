import { SetMetadata } from '@nestjs/common';

export const ADMIN_ROLES_KEY = 'admin_roles';

/**
 * Allowed admin roles: SUPER_ADMIN, ADMIN.
 * Use on admin portal routes; AdminRolesGuard will enforce them.
 */
export const AdminRoles = (...roles: string[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
