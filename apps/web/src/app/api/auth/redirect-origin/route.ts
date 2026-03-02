import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug: returns the redirect origin that POST /api/auth/login would use.
 * Call from dev (e.g. http://172.28.92.56:3000/api/auth/redirect-origin) to verify
 * you get the public URL, not localhost. Safe to remove or restrict in production.
 */
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

export async function GET(req: NextRequest) {
  const origin = getRedirectOrigin(req);
  return NextResponse.json({
    redirectOrigin: origin,
    env: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? '(set)' : '(not set)',
      VERCEL_URL: process.env.VERCEL_URL ? '(set)' : '(not set)',
    },
    headers: {
      host: req.headers.get('host'),
      'x-forwarded-host': req.headers.get('x-forwarded-host'),
      'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
    },
  });
}
