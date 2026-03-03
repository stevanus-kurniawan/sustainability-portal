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

/** Get all Set-Cookie header values from a fetch Response (Node 18+ getSetCookie, or fallback). */
function getSetCookiesFromResponse(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?(): string[] };
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

/**
 * Server-side login: call backend, return 200 OK with body + Set-Cookie.
 * FE redirects to landing page on 200. Same-origin response so browser stores cookies.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const form = await req.formData();
      body = {
        email: (form.get('email') as string) || '',
        password: (form.get('password') as string) || '',
      };
    }
  } catch {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password required' }, { status: 400 });
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
    return NextResponse.json({ message: 'Cannot reach the server. Please try again.' }, { status: 502 });
  }

  const responseBody = await res.text();
  let data: unknown;
  try {
    data = responseBody ? JSON.parse(responseBody) : null;
  } catch {
    data = { message: 'Invalid response from server' };
  }

  if (!res.ok) {
    const message = (data as { message?: string })?.message || 'Login failed';
    return NextResponse.json({ message }, { status: res.status });
  }

  const proto = req.nextUrl.protocol;
  const requestIsHttps = proto === 'https:';

  const responseHeaders = new Headers();
  const setCookies = getSetCookiesFromResponse(res);

  if (setCookies?.length) {
    setCookies.forEach((c) => {
      responseHeaders.append('set-cookie', rewriteCookieHeader(c, requestIsHttps));
    });
  }

  return NextResponse.json(data, { status: 200, headers: responseHeaders });
}
