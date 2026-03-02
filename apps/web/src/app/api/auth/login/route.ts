import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api';

function getBackendBase(req: NextRequest): string {
  const v = process.env['API_BACKEND_URL'];
  if (v && typeof v === 'string') {
    return v.replace(/\/api\/v1\/?$/i, '').trim() + '/api/v1';
  }
  return getInternalApiBase(req);
}

/** Strip Domain and optionally Secure so cookies work when sent from this host. */
function rewriteCookieHeader(cookieHeader: string, requestIsHttps: boolean): string {
  let out = cookieHeader.replace(/\s*;\s*Domain=[^;]+/gi, '');
  if (!requestIsHttps) {
    out = out.replace(/\s*;\s*Secure\b/gi, '');
  }
  return out;
}

/** Build the public origin (e.g. http://172.28.92.56:3000) so redirect goes to the host the user used, not internal localhost. */
function getRedirectOrigin(req: NextRequest): string {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (envOrigin) {
    const base = envOrigin.startsWith('http') ? envOrigin : `https://${envOrigin}`;
    try {
      const u = new URL(base);
      return u.origin;
    } catch {
      // ignore
    }
  }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol?.replace(':', '') || 'http';
  if (host) {
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

/**
 * Server-side login: call backend, then return 302 redirect with Set-Cookie from backend.
 * Browsers reliably store cookies when they receive a redirect response (vs 200 + JSON from fetch).
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; next?: string };
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const form = await req.formData();
      body = {
        email: (form.get('email') as string) || '',
        password: (form.get('password') as string) || '',
        next: (form.get('next') as string) || '/',
      };
    }
  } catch {
    return NextResponse.redirect(new URL('/login?error=invalid-request', getRedirectOrigin(req)), 302);
  }

  const email = body.email?.trim();
  const password = body.password;
  const nextUrl = body.next && body.next.startsWith('/') ? body.next : '/';

  if (!email || !password) {
    return NextResponse.redirect(new URL('/login?error=missing-fields', getRedirectOrigin(req)), 302);
  }

  const base = getBackendBase(req);
  const backendUrl = `${base.replace(/\/$/, '')}/auth/login`;

  let res: Response;
  try {
    res = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch (err) {
    return NextResponse.redirect(new URL('/login?error=network', getRedirectOrigin(req)), 302);
  }

  if (!res.ok) {
    return NextResponse.redirect(new URL('/login?error=invalid-credentials', getRedirectOrigin(req)), 302);
  }

  const proto = req.nextUrl.protocol;
  const requestIsHttps = proto === 'https:';

  const redirectOrigin = getRedirectOrigin(req);
  const redirectResponse = NextResponse.redirect(new URL(nextUrl, redirectOrigin), 302);
  const setCookies =
    'getSetCookie' in res.headers
      ? (res.headers as Headers & { getSetCookie(): string[] }).getSetCookie()
      : null;

  if (setCookies?.length) {
    setCookies.forEach((c) => {
      redirectResponse.headers.append('set-cookie', rewriteCookieHeader(c, requestIsHttps));
    });
  }

  return redirectResponse;
}
