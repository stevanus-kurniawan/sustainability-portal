export function getInternalApiBase(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  // Server-side only: Node fetch requires absolute URLs. Use INTERNAL_API_URL or
  // API_BACKEND_URL when set (required when NEXT_PUBLIC_API_URL is relative, e.g. /api/v1).
  if (typeof window === 'undefined') {
    const internalBase = process.env.INTERNAL_API_URL ?? (process.env.API_BACKEND_URL ? `${process.env.API_BACKEND_URL.replace(/\/api\/v1\/?$/, '')}/api/v1` : null);
    if (internalBase) return internalBase;
    if (process.env.SLMS_DOCKER_WEB === 'true') {
      return publicUrl.replace('http://localhost:3001', 'http://slms-api:3001');
    }
  }

  return publicUrl;
}

