import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api';

/** Docker Compose API host; used when connection to localhost fails (web container can't reach host). */
const DOCKER_API_ORIGIN = 'http://slms-api:3001';

function isConnectionRefused(err: unknown): boolean {
  const e = err as NodeJS.ErrnoException & { cause?: NodeJS.ErrnoException; errors?: Array<{ code?: string }> };
  const code = e?.code ?? e?.cause?.code ?? e?.errors?.[0]?.code;
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND';
}

async function doFetch(
  backendUrl: string,
  method: string,
  headers: HeadersInit,
  body: string | undefined,
  redirect: RequestRedirect = 'follow',
): Promise<Response> {
  return fetch(backendUrl, {
    method,
    headers,
    body,
    cache: 'no-store',
    redirect,
  });
}

/**
 * Proxy all /api/v1/* requests to the backend. In Docker, if the resolved URL is localhost
 * and the connection is refused, retry with slms-api:3001 so the web container can reach the API.
 */
async function proxyToBackend(request: NextRequest, pathSegments: string[]) {
  // Prefer runtime env from getter; then getInternalApiBase. If base is localhost we'll retry with slms-api on failure (Docker).
  let base = getRuntimeBackendBase() || getInternalApiBase(request);
  const path = pathSegments.length ? pathSegments.join('/') : '';
  const pathPart = path ? `/${path}` : '';
  const search = request.nextUrl.searchParams.toString();
  const queryPart = search ? `?${search}` : '';
  let backendUrl = `${base.replace(/\/$/, '')}${pathPart}${queryPart}`;

  const headers: HeadersInit = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'cookie' ||
      lower === 'content-type' ||
      lower === 'authorization' ||
      lower === 'x-csrf-token' ||
      lower === 'x-xsrf-token' ||
      lower === 'x-forwarded-proto' ||
      lower === 'x-forwarded-host' ||
      lower === 'x-forwarded-for'
    ) {
      headers[key] = value;
    }
  });
  const forwardedProto =
    request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const forwardedHost =
    request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (forwardedProto && !('x-forwarded-proto' in headers) && !('X-Forwarded-Proto' in headers)) {
    headers['x-forwarded-proto'] = forwardedProto;
  }
  if (forwardedHost) {
    headers['x-forwarded-host'] = forwardedHost;
  }

  const isOidc = path.startsWith('auth/oidc');

  let body: string | undefined;
  const contentType = request.headers.get('content-type') || '';
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      if (contentType.includes('application/json')) {
        const json = await request.json();
        body = JSON.stringify(json);
      } else {
        body = await request.text();
      }
    } catch {
      body = undefined;
    }
  }

  const method = request.method;
  const redirect: RequestRedirect = isOidc ? 'manual' : 'follow';

  try {
    const res = await doFetch(backendUrl, method, headers, body, redirect);
    return await forwardResponse(request, res, isOidc);
  } catch (err) {
    if (/localhost|127\.0\.0\.1/.test(backendUrl)) {
      const fallbackUrl = backendUrl.replace(/https?:\/\/[^/]+/, DOCKER_API_ORIGIN);
      try {
        const res = await doFetch(fallbackUrl, method, headers, body, redirect);
        return await forwardResponse(request, res, isOidc);
      } catch (retryErr) {
        const message = retryErr instanceof Error ? retryErr.message : 'Backend request failed';
        return NextResponse.json(
          { message: `Cannot reach the API: ${message}` },
          { status: 502 }
        );
      }
    }
    const message = err instanceof Error ? err.message : 'Backend request failed';
    return NextResponse.json(
      { message: `Cannot reach the API: ${message}` },
      { status: 502 }
    );
  }
}

// Ensure runtime env is used: read at request time via a getter (avoids Next inlining).
function getRuntimeBackendBase(): string | null {
  try {
    const v = process.env['API_BACKEND_URL'];
    if (!v || typeof v !== 'string') return null;
    return v.replace(/\/api\/v1\/?$/, '').trim() + '/api/v1';
  } catch {
    return null;
  }
}

/**
 * Rewrite Set-Cookie so cookies work when the response is sent via this proxy (same-origin).
 * - Remove Domain= so the cookie is bound to the frontend host (fixes redirect after login on two-server dev).
 * - Remove Secure when the request to the proxy is HTTP so the browser accepts the cookie on HTTP dev.
 */
function rewriteSetCookieForFrontendHost(cookieHeader: string, requestIsHttps: boolean): string {
  let out = cookieHeader.replace(/\s*;\s*Domain=[^;]+/gi, '');
  if (!requestIsHttps) {
    out = out.replace(/\s*;\s*Secure\b/gi, '');
  }
  return out;
}

/** Get all Set-Cookie header values (Node 18+ getSetCookie, or fallback so admin-auth/login cookie is always forwarded). */
function getSetCookiesFromResponse(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?(): string[] };
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

async function forwardResponse(
  request: NextRequest,
  res: Response,
  isOidc = false,
): Promise<NextResponse> {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const requestIsHttps =
    forwardedProto === 'https' || request.nextUrl.protocol === 'https:';

  if (isOidc && res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location');
    if (!location) {
      return NextResponse.json({ message: 'SSO redirect missing Location' }, { status: 502 });
    }

    const setCookies = getSetCookiesFromResponse(res);

    // If there are cookies to set (auth callback → tokens), return a 200 HTML page that
    // sets cookies before navigating. NextResponse.redirect() can silently drop Set-Cookie
    // headers in some Next.js configurations, causing the session to be lost.
    if (setCookies.length > 0) {
      const safeUrl = JSON.stringify(location);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><script>window.location.replace(${safeUrl})</script><noscript><meta http-equiv="refresh" content="0;url=${location.replace(/"/g, '&quot;')}"></noscript></head><body></body></html>`;
      const response = new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
      setCookies.forEach((c) => {
        response.headers.append('set-cookie', rewriteSetCookieForFrontendHost(c, requestIsHttps));
      });
      return response;
    }

    // No cookies (e.g. login-start redirect to Hub) — plain redirect is fine.
    const response = NextResponse.redirect(location, res.status as 301 | 302 | 303 | 307 | 308);
    return response;
  }

  const responseHeaders = new Headers();
  const setCookies = getSetCookiesFromResponse(res);
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie') {
      if (!setCookies.length) responseHeaders.append(key, value);
    } else if (lower !== 'content-encoding' && lower !== 'transfer-encoding') {
      responseHeaders.set(key, value);
    }
  });
  if (setCookies.length) {
    setCookies.forEach((c) => {
      responseHeaders.append('set-cookie', rewriteSetCookieForFrontendHost(c, requestIsHttps));
    });
  }

  const responseBody = await res.text();
  try {
    const data = responseBody ? JSON.parse(responseBody) : null;
    return NextResponse.json(data, { status: res.status, headers: responseHeaders });
  } catch {
    return new NextResponse(responseBody || null, {
      status: res.status,
      headers: responseHeaders,
    });
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToBackend(request, path || []);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToBackend(request, path || []);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToBackend(request, path || []);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToBackend(request, path || []);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToBackend(request, path || []);
}
