import { NextRequest, NextResponse } from 'next/server';

const DOCKER_API_ORIGIN = 'http://slms-api:3001';

function getBackendOrigin(): string {
  const v = process.env.API_BACKEND_URL;
  if (v && typeof v === 'string') {
    return v.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '').trim();
  }
  if (process.env.SLMS_DOCKER_WEB === 'true') {
    return DOCKER_API_ORIGIN;
  }
  return 'http://localhost:3001';
}

function rewriteCookieHeader(cookieHeader: string, requestIsHttps: boolean): string {
  let out = cookieHeader.replace(/\s*;\s*Domain=[^;]+/gi, '');
  if (!requestIsHttps) {
    out = out.replace(/\s*;\s*Secure\b/gi, '');
  }
  return out;
}

function getSetCookiesFromResponse(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?(): string[] };
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function isConnectionRefused(err: unknown): boolean {
  const e = err as NodeJS.ErrnoException & { cause?: NodeJS.ErrnoException; errors?: Array<{ code?: string }> };
  const code = e?.code ?? e?.cause?.code ?? e?.errors?.[0]?.code;
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND';
}

function applyBackendCookies(
  response: NextResponse,
  upstream: Response,
  requestIsHttps: boolean,
): void {
  const setCookies = getSetCookiesFromResponse(upstream);
  setCookies.forEach((c) => {
    response.headers.append('set-cookie', rewriteCookieHeader(c, requestIsHttps));
  });
}

async function proxyOidc(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const path = pathSegments.filter(Boolean).join('/');
  const search = request.nextUrl.search;
  const origin = getBackendOrigin();
  let backendUrl = `${origin}/api/v1/auth/oidc/${path}${search}`;

  const headers: Record<string, string> = {};
  const cookie = request.headers.get('cookie');
  if (cookie) headers.cookie = cookie;
  const proto =
    request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (proto) headers['x-forwarded-proto'] = proto;
  if (host) headers['x-forwarded-host'] = host;

  const requestIsHttps =
    request.headers.get('x-forwarded-proto') === 'https' ||
    request.nextUrl.protocol === 'https:';

  const doFetch = (url: string) =>
    fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
      redirect: 'manual',
    });

  let upstream: Response;
  try {
    upstream = await doFetch(backendUrl);
  } catch (err) {
    if (isConnectionRefused(err) && /localhost|127\.0\.0\.1/.test(backendUrl)) {
      backendUrl = backendUrl.replace(/https?:\/\/[^/]+/, DOCKER_API_ORIGIN);
      try {
        upstream = await doFetch(backendUrl);
      } catch {
        return NextResponse.json({ message: 'Cannot reach the API' }, { status: 502 });
      }
    } else {
      return NextResponse.json({ message: 'Cannot reach the API' }, { status: 502 });
    }
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get('location');
    if (!location) {
      return NextResponse.json({ message: 'SSO redirect missing Location' }, { status: 502 });
    }
    const response = NextResponse.redirect(location, upstream.status as 301 | 302 | 303 | 307 | 308);
    applyBackendCookies(response, upstream, requestIsHttps);
    return response;
  }

  const body = await upstream.text();
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie' || lower === 'content-encoding' || lower === 'transfer-encoding') {
      return;
    }
    responseHeaders.set(key, value);
  });
  const response = new NextResponse(body || null, {
    status: upstream.status,
    headers: responseHeaders,
  });
  applyBackendCookies(response, upstream, requestIsHttps);
  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } | Promise<{ path: string[] }> },
) {
  const params = await context.params;
  return proxyOidc(request, params?.path || []);
}
