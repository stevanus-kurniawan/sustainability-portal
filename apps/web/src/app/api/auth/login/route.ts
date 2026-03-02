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
    return NextResponse.redirect(new URL('/login?error=invalid-request', req.url), 302);
  }

  const email = body.email?.trim();
  const password = body.password;
  const nextUrl = body.next && body.next.startsWith('/') ? body.next : '/';

  if (!email || !password) {
    return NextResponse.redirect(new URL('/login?error=missing-fields', req.url), 302);
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
    return NextResponse.redirect(new URL('/login?error=network', req.url), 302);
  }

  if (!res.ok) {
    return NextResponse.redirect(new URL('/login?error=invalid-credentials', req.url), 302);
  }

  const proto = req.nextUrl.protocol;
  const requestIsHttps = proto === 'https:';

  const redirectResponse = NextResponse.redirect(new URL(nextUrl, req.url), 302);
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
