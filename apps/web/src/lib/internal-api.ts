export function getInternalApiBase(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  // When running inside the Dockerized web container, calls to http://localhost:3001
  // from Next.js route handlers will fail because "localhost" points to the web
  // container itself, not the API container. In that case, route handlers should
  // talk to the API service by its Docker hostname instead.
  if (typeof window === 'undefined' && process.env.SLMS_DOCKER_WEB === 'true') {
    return publicUrl.replace('http://localhost:3001', 'http://slms-api:3001');
  }

  // Default: use the public URL (works for local non-Docker dev and in the browser)
  return publicUrl;
}

