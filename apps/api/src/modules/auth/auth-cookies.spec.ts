import { getAuthCookieOptions } from './auth-cookies';

describe('getAuthCookieOptions', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env.NODE_ENV = original.NODE_ENV;
    process.env.SESSION_COOKIE_SECURE = original.SESSION_COOKIE_SECURE;
    process.env.SESSION_COOKIE_SAMESITE = original.SESSION_COOKIE_SAMESITE;
  });

  it('does not set Secure on HTTP even when SESSION_COOKIE_SECURE=true', () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_COOKIE_SECURE = 'true';
    const opts = getAuthCookieOptions({
      secure: false,
      headers: { 'x-forwarded-proto': 'http' },
    });
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe('lax');
  });

  it('keeps Secure on HTTPS production', () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_COOKIE_SECURE = 'true';
    const opts = getAuthCookieOptions({
      secure: false,
      headers: { 'x-forwarded-proto': 'https' },
    });
    expect(opts.secure).toBe(true);
  });
});
