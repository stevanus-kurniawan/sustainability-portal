import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const COOKIE_NAME = 'admin_access_token';

function getToken(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE_NAME)?.value;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getToken(_request);
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const url = `${API_BASE}/admin/documents/${id}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data || { message: res.statusText }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Backend request failed' },
      { status: 502 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  const url = `${API_BASE}/admin/documents/${id}`;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data || { message: res.statusText }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Backend request failed' },
      { status: 502 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getToken(_request);
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const url = `${API_BASE}/admin/documents/${id}`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204 || res.ok) {
      return new NextResponse(null, { status: 204 });
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data || { message: res.statusText }, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Backend request failed' },
      { status: 502 }
    );
  }
}
