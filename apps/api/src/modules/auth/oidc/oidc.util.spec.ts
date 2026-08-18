import {
  buildAuthorizeUrl,
  buildTokenRequestBody,
  createPkcePair,
  defaultOidcCallbackPath,
  firstOrigin,
  isLoopbackHost,
  isPlaceholderHost,
  originFromUrl,
  publicCallbackUrl,
  requireSingleUrl,
} from './oidc.util';

describe('oidc.util', () => {
  it('creates an S256 PKCE pair', () => {
    const { codeVerifier, codeChallenge } = createPkcePair();
    expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(codeVerifier).not.toEqual(codeChallenge);
  });

  it('rejects placeholder and comma-joined URLs', () => {
    expect(isPlaceholderHost('https://<hub-host>/api/sso/.well-known/openid-configuration')).toBe(
      true,
    );
    expect(() => requireSingleUrl('http://a/cb,http://b/cb', 'OIDC_REDIRECT_URI')).toThrow(
      /single URL/,
    );
    expect(requireSingleUrl('https://app.example.com/', 'FRONTEND_URL')).toBe(
      'https://app.example.com',
    );
  });

  it('builds authorize URL with PKCE params', () => {
    const url = buildAuthorizeUrl('https://hub.example.com/api/sso/authorize', {
      client_id: 'sustainability-portal',
      response_type: 'code',
      redirect_uri: 'https://app.example.com/auth/oidc/callback',
      scope: 'openid email profile',
      code_challenge: 'abc',
      code_challenge_method: 'S256',
      state: 'st',
      nonce: 'nn',
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('client_id')).toBe('sustainability-portal');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'https://app.example.com/auth/oidc/callback',
    );
  });

  it('builds a JSON token-exchange body (not form fields as a string)', () => {
    const body = buildTokenRequestBody({
      code: 'auth-code',
      redirectUri: 'https://app.example.com/auth/oidc/callback',
      clientId: 'sustainability-portal',
      codeVerifier: 'verifier',
    });
    expect(body).toEqual({
      grant_type: 'authorization_code',
      code: 'auth-code',
      redirect_uri: 'https://app.example.com/auth/oidc/callback',
      client_id: 'sustainability-portal',
      code_verifier: 'verifier',
    });
    expect(JSON.stringify(body)).not.toContain('grant_type=authorization_code');
  });

  it('reconstructs the public callback URL Hub redirected to', () => {
    expect(
      publicCallbackUrl({
        headers: {
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'sustainability.kpndomain.com',
        },
        originalUrl:
          '/api/v1/auth/oidc/callback?code=abc&state=st&code_verifier=ver',
      }),
    ).toBe('https://sustainability.kpndomain.com/api/v1/auth/oidc/callback');
  });

  it('treats localhost FRONTEND_URL as loopback and picks /api/v1 callback on public hosts', () => {
    expect(isLoopbackHost('http://localhost:3000')).toBe(true);
    expect(isLoopbackHost('https://sustainability.kpndomain.com')).toBe(false);
    expect(defaultOidcCallbackPath('http://localhost:3000')).toBe('/auth/oidc/callback');
    expect(defaultOidcCallbackPath('https://sustainability.kpndomain.com')).toBe(
      '/api/v1/auth/oidc/callback',
    );
    expect(firstOrigin('https://a.example.com,https://b.example.com')).toBe(
      'https://a.example.com',
    );
    expect(
      originFromUrl('https://sustainability.kpndomain.com/api/v1/auth/oidc/callback'),
    ).toBe('https://sustainability.kpndomain.com');
  });
});
