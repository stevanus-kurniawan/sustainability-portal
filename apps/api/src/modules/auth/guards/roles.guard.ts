import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.userRoles) {
      return false;
    }

    // Get role names from user's roles
    const userRoleNames = user.userRoles.map((ur: any) => ur.role?.name).filter(Boolean);

    // Check if user has any of the required roles
    return requiredRoles.some((role) => userRoleNames.includes(role));
  }
}
