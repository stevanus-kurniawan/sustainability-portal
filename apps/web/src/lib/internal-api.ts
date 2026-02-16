import type { NextRequest } from 'next/server';

/**
 * Base URL for server-side API calls. Call with the route request so that when
 * INTERNAL_API_URL/API_BACKEND_URL are unset (e.g. env not in container), we can
 * fall back to same-origin and let the Next.js rewrite proxy to the backend.
 */
export function getInternalApiBase(request?: NextRequest | null): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  if (typeof window === 'undefined') {
    const internalBase = process.env.INTERNAL_API_URL ?? (process.env.API_BACKEND_URL ? `${process.env.API_BACKEND_URL.replace(/\/api\/v1\/?$/, '')}/api/v1` : null);
    if (internalBase) return internalBase;
    if (process.env.SLMS_DOCKER_WEB === 'true') {
      return publicUrl.replace('http://localhost:3001', 'http://slms-api:3001');
    }
    // Fallback: publicUrl may be relative (/api/v1). Node fetch needs absolute URL.
    // Use request origin so we call same-origin; Next.js rewrite will proxy to backend.
    if (request && (publicUrl.startsWith('/') || !/^https?:\/\//i.test(publicUrl))) {
      try {
        const origin = new URL(request.url).origin;
        return `${origin}${publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`}`;
      } catch {
        // ignore
      }
    }
  }

  return publicUrl;
}

