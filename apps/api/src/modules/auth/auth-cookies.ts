import * as crypto from 'crypto';
import { CookieOptions, Response } from 'express';

export const USER_ACCESS_TOKEN_COOKIE = 'user_access_token';
export const CSRF_COOKIE_NAME = 'csrf_token';
export const OIDC_PKCE_COOKIE = 'oidc_pkce';

const PKCE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

export function getAuthCookieOptions(req?: any): CookieOptions {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';
  const forwardedProto = req?.headers?.['x-forwarded-proto'];
  const reqSecure = !!req?.secure;
  const appearsSecure = reqSecure || forwardedProto === 'https';

  const secureEnv = (process.env.SESSION_COOKIE_SECURE || '').toLowerCase();
  let secure: boolean;
  if (secureEnv === 'true' || secureEnv === '1') {
    secure = true;
  } else if (secureEnv === 'false' || secureEnv === '0') {
    secure = false;
  } else {
    secure = isProd ? true : appearsSecure;
  }

  const sameSiteRaw = (
    process.env.SESSION_COOKIE_SAMESITE ||
    process.env.COOKIE_SAMESITE ||
    'lax'
  ).toLowerCase();
  const sameSite: 'lax' | 'strict' | 'none' =
    sameSiteRaw === 'none' || sameSiteRaw === 'strict' || sameSiteRaw === 'lax'
      ? sameSiteRaw
      : 'lax';

  const domain = process.env.COOKIE_DOMAIN || undefined;

  return {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: '/',
  };
}

export function setUserSessionCookies(
  res: Response,
  token: string,
  expiresInSeconds: number,
  req?: any,
): void {
  const baseOptions = getAuthCookieOptions(req);
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie(USER_ACCESS_TOKEN_COOKIE, token, {
    ...baseOptions,
    maxAge: expiresInSeconds * 1000,
  });

  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...baseOptions,
    httpOnly: false,
    maxAge: expiresInSeconds * 1000,
  });
}

export function clearUserSessionCookies(res: Response, req?: any): void {
  const baseOptions = getAuthCookieOptions(req);
  res.clearCookie(USER_ACCESS_TOKEN_COOKIE, baseOptions);
  res.clearCookie(CSRF_COOKIE_NAME, {
    ...baseOptions,
    httpOnly: false,
  });
}

export function setOidcPkceCookie(res: Response, value: string, req?: any): void {
  res.cookie(OIDC_PKCE_COOKIE, value, {
    ...getAuthCookieOptions(req),
    maxAge: PKCE_COOKIE_MAX_AGE_MS,
  });
}

export function clearOidcPkceCookie(res: Response, req?: any): void {
  res.clearCookie(OIDC_PKCE_COOKIE, getAuthCookieOptions(req));
}
