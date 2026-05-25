import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api';

const COOKIE_NAME = 'admin_access_token';

function getToken(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE_NAME)?.value;
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id: idRaw } = await context.params;
  const id = parseId(idRaw);
  if (!id) return NextResponse.json({ message: 'Invalid id' }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  try {
    const res = await fetch(`${getInternalApiBase(request)}/admin/operational-units/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json(data || { message: res.statusText }, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Backend request failed' },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { id: idRaw } = await context.params;
  const id = parseId(idRaw);
  if (!id) return NextResponse.json({ message: 'Invalid id' }, { status: 400 });

  try {
    const res = await fetch(`${getInternalApiBase(request)}/admin/operational-units/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json(data || { message: res.statusText }, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Backend request failed' },
      { status: 502 },
    );
  }
}
