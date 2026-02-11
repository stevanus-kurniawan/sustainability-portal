import { NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api';

const API_BASE = getInternalApiBase();

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
