import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators/public.decorator';

const USER_ACCESS_TOKEN_COOKIE = 'user_access_token';
const CSRF_COOKIE_NAME = 'csrf_token';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = (request.method || 'GET').toUpperCase();

    // Skip CSRF check for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Skip CSRF for auth endpoints that don't need it: admin-auth, and logout (self-action, no state change to app data)
    const path = (request.url || request.path || '').toLowerCase();
    if (path.includes('admin-auth')) {
      return true;
    }
    if (path.includes('auth/logout') || (path.includes('auth') && path.endsWith('/logout'))) {
      return true;
    }

    const hasUserCookie = !!request.cookies?.[USER_ACCESS_TOKEN_COOKIE];

    // If we're not using cookie-based user auth, do not enforce CSRF here
    if (!hasUserCookie) {
      return true;
    }

    // Only enforce CSRF on "unsafe" HTTP methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
    const headerToken =
      request.headers['x-csrf-token'] || request.headers['x-xsrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}

