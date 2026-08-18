import * as crypto from 'crypto';

const PLACEHOLDER_RE = /<[^>]+>|%3c[^%]+%3e/i;

export function randomUrlSafe(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('base64url');
}

export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomUrlSafe(32);
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function isPlaceholderHost(value: string): boolean {
  return !value || PLACEHOLDER_RE.test(value);
}

export function requireSingleUrl(value: string, name: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    throw new Error(`${name} is empty`);
  }
  if (trimmed.includes(',')) {
    throw new Error(`${name} must be a single URL (comma-joined values are not allowed)`);
  }
  if (isPlaceholderHost(trimmed)) {
    throw new Error(`${name} still contains a placeholder hostname`);
  }
  return trimmed.replace(/\/$/, '');
}

export function buildAuthorizeUrl(
  authorizationEndpoint: string,
  params: Record<string, string>,
): string {
  const url = new URL(authorizationEndpoint);
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }
  return url.toString();
}

export function buildTokenRequestBody(input: {
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
}): Record<string, string> {
  return {
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    code_verifier: input.codeVerifier,
  };
}

function headerFirst(req: { headers?: Record<string, unknown> }, name: string): string {
  const raw = req?.headers?.[name] ?? req?.headers?.[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || !value.trim()) return '';
  return value.split(',')[0].trim();
}

export function isLoopbackHost(urlOrHost: string): boolean {
  const raw = (urlOrHost || '').trim();
  if (!raw) return true;
  try {
    const host = raw.includes('://') ? new URL(raw).hostname : raw.split(':')[0];
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|slms-api)$/i.test(host);
  } catch {
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|slms-api)$/i.test(raw);
  }
}

export function firstOrigin(raw?: string): string {
  const value = (raw || '').split(',')[0].trim();
  return value && !isPlaceholderHost(value) ? value.replace(/\/$/, '') : '';
}

/** Public site origin (no path) from forwarded headers, or null if internal/unknown. */
export function publicOrigin(req: {
  headers?: Record<string, unknown>;
  secure?: boolean;
}): string | null {
  const proto =
    headerFirst(req, 'x-forwarded-proto') || (req.secure ? 'https' : 'http');
  const host = headerFirst(req, 'x-forwarded-host') || headerFirst(req, 'host');
  if (!host || isLoopbackHost(host)) return null;
  return requireSingleUrl(`${proto}://${host}`, 'FRONTEND_URL');
}

/** Public callback URL as the browser saw it (no query). Used as token-exchange redirect_uri. */
export function publicCallbackUrl(req: {
  headers?: Record<string, unknown>;
  secure?: boolean;
  originalUrl?: string;
  url?: string;
}): string {
  const origin = publicOrigin(req);
  const path = String(req.originalUrl || req.url || '').split('?')[0];
  if (!origin || !path) {
    throw new Error('cannot determine public callback URL');
  }
  return requireSingleUrl(`${origin}${path}`, 'OIDC_REDIRECT_URI');
}

export function defaultOidcCallbackPath(frontendUrl: string): string {
  return isLoopbackHost(frontendUrl)
    ? '/auth/oidc/callback'
    : '/api/v1/auth/oidc/callback';
}

/** Origin (scheme + host) of a full URL, e.g. callback URI → site root. */
export function originFromUrl(url: string): string {
  const parsed = new URL(requireSingleUrl(url, 'OIDC_REDIRECT_URI'));
  return `${parsed.protocol}//${parsed.host}`;
}
