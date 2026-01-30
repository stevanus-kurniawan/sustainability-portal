import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const COOKIE_NAME = 'admin_access_token';

function getToken(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE_NAME)?.value;
}

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  let body: { fileName?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }
  const url = `${API_BASE}/admin/upload/presign`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: body.fileName || 'document',
        contentType: body.contentType,
      }),
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
