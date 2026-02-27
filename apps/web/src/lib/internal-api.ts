import type { NextRequest } from 'next/server';

/**
 * Base URL for server-side API calls. Call with the route request when in a
 * Route Handler so that when INTERNAL_API_URL/API_BACKEND_URL are unset we can
 * fall back to same-origin. In Server Components there is no request; we use
 * next/headers to build the origin so fetch() gets an absolute URL.
 */
export function getInternalApiBase(request?: NextRequest | null): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  if (typeof window === 'undefined') {
    const internalBase = process.env.INTERNAL_API_URL ?? (process.env.API_BACKEND_URL ? `${process.env.API_BACKEND_URL.replace(/\/api\/v1\/?$/, '')}/api/v1` : null);
    if (internalBase) return internalBase;
    if (process.env.SLMS_DOCKER_WEB === 'true') {
      return publicUrl.replace('http://localhost:3001', 'http://slms-api:3001');
    }
    const needAbsolute = publicUrl.startsWith('/') || !/^https?:\/\//i.test(publicUrl);
    if (!needAbsolute) return publicUrl;
    // Fallback: Node fetch needs absolute URL. Use request origin (Route Handler) or headers (Server Component).
    if (request) {
      try {
        const origin = new URL(request.url).origin;
        return `${origin}${publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`}`;
      } catch {
        // ignore
      }
    }
    try {
      const { headers } = require('next/headers');
      const h = headers();
      const host = h.get('host');
      const proto = h.get('x-forwarded-proto') || 'http';
      if (host) return `${proto}://${host}${publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`}`;
    } catch {
      // next/headers not available or headers() failed
    }
  }

  return publicUrl;
}

