import { NextRequest, NextResponse } from 'next/server';

export function requestAppearsHttps(request: NextRequest): boolean {
  const forwarded = (request.headers.get('x-forwarded-proto') || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (forwarded === 'http') return false;
  if (forwarded === 'https') return true;
  return request.nextUrl.protocol === 'https:';
}

export function rewriteCookieHeader(cookieHeader: string, requestIsHttps: boolean): string {
  let out = cookieHeader.replace(/\s*;\s*Domain=[^;]+/gi, '');
  if (!requestIsHttps) {
    out = out.replace(/\s*;\s*Secure\b/gi, '');
  }
  return out;
}

export function getSetCookiesFromResponse(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?(): string[] };
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function applyParsedCookie(response: NextResponse, header: string, requestIsHttps: boolean): void {
  const rewritten = rewriteCookieHeader(header, requestIsHttps);
  const eq = rewritten.indexOf('=');
  if (eq < 1) return;
  const name = rewritten.slice(0, eq).trim();
  if (!name) return;
  const parts = rewritten.slice(eq + 1).split(';').map((p) => p.trim());
  const value = parts[0] ?? '';
  const opts: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
    maxAge?: number;
  } = { path: '/' };
  for (const part of parts.slice(1)) {
    const colon = part.indexOf('=');
    const key = (colon === -1 ? part : part.slice(0, colon)).trim().toLowerCase();
    const raw = colon === -1 ? '' : part.slice(colon + 1).trim();
    if (key === 'httponly') opts.httpOnly = true;
    else if (key === 'secure') opts.secure = true;
    else if (key === 'samesite') {
      const v = raw.toLowerCase();
      if (v === 'lax' || v === 'strict' || v === 'none') opts.sameSite = v;
    } else if (key === 'path' && raw) opts.path = raw;
    else if (key === 'max-age' && raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) opts.maxAge = n;
    }
  }
  if (!requestIsHttps) opts.secure = false;
  response.cookies.set(name, value, opts);
}

export function applyOidcCookies(
  response: NextResponse,
  cookies: string[],
  requestIsHttps: boolean,
): void {
  cookies.forEach((c) => applyParsedCookie(response, c, requestIsHttps));
}

/** 200 HTML so the browser stores Set-Cookie before navigating (303 drops cookies). */
export function oidcHtmlRedirect(dest: string, cookies: string[], requestIsHttps: boolean): NextResponse {
  const safeUrl = JSON.stringify(dest);
  const safeAttr = dest.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-store"><title>Signing in</title><script>(function(){var d=${safeUrl};function go(){window.location.replace(d);}if(document.readyState==="complete"){setTimeout(go,50);}else{window.addEventListener("load",function(){setTimeout(go,50);});}})();</script><noscript><meta http-equiv="refresh" content="0;url=${safeAttr}"></noscript></head><body><p>Signing you in…</p></body></html>`;
  const response = new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
  applyOidcCookies(response, cookies, requestIsHttps);
  return response;
}
