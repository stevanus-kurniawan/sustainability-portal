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
 * Server-side visitor logout: forward request (with Cookie) to backend, return response with Set-Cookie.
 * Avoids CSRF on the client path and ensures cookie-clearing response is forwarded to the browser.
 */
export async function POST(req: NextRequest) {
  const base = getBackendBase(req);
  const backendUrl = `${base.replace(/\/$/, '')}/auth/logout`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const cookie = req.headers.get('cookie');
  if (cookie) {
    headers['cookie'] = cookie;
  }

  let body: string | undefined;
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await req.json().catch(() => ({}));
      body = JSON.stringify(json);
    }
  } catch {
    body = undefined;
  }

  let res: Response;
  try {
    res = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: body ?? undefined,
      cache: 'no-store',
    });
  } catch (err) {
    return NextResponse.json(
      { message: 'Cannot reach the server. Please try again.' },
      { status: 502 }
    );
  }

  const responseBody = await res.text();
  let data: unknown;
  try {
    data = responseBody ? JSON.parse(responseBody) : null;
  } catch {
    data = { message: 'Logout response invalid' };
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

  return NextResponse.json(data, { status: res.status, headers: responseHeaders });
}
