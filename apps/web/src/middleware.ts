import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const USER_ACCESS_TOKEN = 'user_access_token';
const ADMIN_ACCESS_TOKEN = 'admin_access_token';

const PUBLIC_USER_ROUTES = [
  '/login',
  '/register',
  '/register/verify-email',
  '/auth/verify-email',
  '/forgot-password',
  '/auth/reset-password',
];
const DASHBOARD_ROUTES = ['/', '/home'];
const ADMIN_PREFIX = '/admin';
const ADMIN_LOGIN = '/admin/login';

function hasUserCookie(req: NextRequest): boolean {
  return req.cookies.has(USER_ACCESS_TOKEN);
}

function hasAdminCookie(req: NextRequest): boolean {
  return req.cookies.has(ADMIN_ACCESS_TOKEN);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin area: all /admin/* except /admin/login require admin cookie
  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (pathname === ADMIN_LOGIN || pathname === `${ADMIN_LOGIN}/`) {
      return NextResponse.next();
    }
    if (!hasAdminCookie(req)) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, req.url));
    }
    return NextResponse.next();
  }

  // Public user routes: allow without cookie; if authenticated, redirect to landing
  if (PUBLIC_USER_ROUTES.some((r) => pathname === r || pathname === r + '/')) {
    if (hasUserCookie(req)) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // All other portal routes require user cookie
  if (!hasUserCookie(req)) {
    const login = new URL('/login', req.url);
    login.searchParams.set('message', 'please-login');
    return NextResponse.redirect(login);
  }

  if (!DASHBOARD_ROUTES.some((r) => pathname === r || pathname === `${r}/`)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets|images|backgrounds|banners|api|logo\\.png).*)',
  ],
};
