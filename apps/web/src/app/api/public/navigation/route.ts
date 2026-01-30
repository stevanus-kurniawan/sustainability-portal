import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/public/navigation`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data || { message: 'Backend error' }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Backend request failed' },
      { status: 502 }
    );
  }
}
