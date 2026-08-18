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
