import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api';

const COOKIE_NAME = 'admin_access_token';

const STORAGE_FIELD_NAMES = [
  'storageSection',
  'sustainabilityType',
  'procedureScope',
  'operationalUnitFolder',
] as const;

function getToken(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE_NAME)?.value;
}

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Invalid form data' }, { status: 400 });
  }
  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ message: 'No file provided' }, { status: 400 });
  }
  const url = `${getInternalApiBase(request)}/admin/upload/upload`;
  try {
    const body = new FormData();
    body.set('file', file, file instanceof File ? file.name : 'file');
    for (const name of STORAGE_FIELD_NAMES) {
      const value = formData.get(name);
      if (typeof value === 'string' && value.trim()) {
        body.set(name, value.trim());
      }
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data || { message: res.statusText }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Backend request failed' },
      { status: 502 },
    );
  }
}
