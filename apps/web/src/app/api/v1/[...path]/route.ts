import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api';

/**
 * Runtime proxy for /api/v1/* so the backend URL is read from env at request time.
 * Fixes Docker where next.config.js rewrites are baked at build time (localhost:3001).
 */
function getBackendBase(request: NextRequest): string {
  const base = getInternalApiBase(request);
  return base.replace(/\/api\/v1\/?$/, '');
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}
export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}
export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}
export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}
export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  try {
    const { path } = await context.params;
    const pathSegments = path?.length ? path.join('/') : '';
    const backendBase = getBackendBase(request);
    const url = `${backendBase}/api/v1/${pathSegments}${request.nextUrl.search}`;

    const headers = new Headers(request.headers);
    headers.delete('host');
    const init: RequestInit = {
      method: request.method,
      headers,
      cache: 'no-store',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type');
      const body = await request.text();
      if (body) {
        init.body = body;
        if (contentType) headers.set('content-type', contentType);
      }
    }

    const res = await fetch(url, init);
    const resHeaders = new Headers(res.headers);
    resHeaders.delete('transfer-encoding');
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Backend request failed';
    const message =
      raw.includes('fetch') || raw.includes('ECONNREFUSED')
        ? 'Cannot reach the API. Ensure the API is running (pnpm dev) and Docker infra is up (pnpm dev:infra).'
        : raw;
    return NextResponse.json({ message }, { status: 502 });
  }
}
