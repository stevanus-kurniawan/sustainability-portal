import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  const res = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { message: data?.message || 'Login failed' },
      { status: res.status },
    );
  }

  const response = NextResponse.json({ success: true });

  if (data.accessToken) {
    response.cookies.set('slms_access_token', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15,
    });
  }

  return response;
}

