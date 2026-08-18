import {
  buildAuthorizeUrl,
  buildTokenRequestBody,
  createPkcePair,
  isPlaceholderHost,
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
});
