import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import {
  buildAuthorizeUrl,
  buildTokenRequestBody,
  createPkcePair,
  defaultOidcCallbackPath,
  isLoopbackHost,
  isPlaceholderHost,
  originFromUrl,
  publicCallbackUrl,
  publicOrigin,
  randomUrlSafe,
  requireSingleUrl,
} from './oidc.util';

export type OidcClaims = JWTPayload & {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
};

type OidcMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
};

type PkceCookiePayload = {
  purpose: 'oidc_pkce';
  state: string;
  nonce: string;
  codeVerifier: string;
};

const METADATA_TTL_MS = 60 * 60 * 1000;
const PKCE_JWT_EXPIRES = '10m';
const HUB_TIMEOUT_MS = 10_000;

@Injectable()
export class OidcService implements OnModuleInit {
  private readonly logger = new Logger(OidcService.name);
  private metadata: OidcMetadata | null = null;
  private metadataFetchedAt = 0;
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private jwksUri: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit() {
    if (this.isConfigured()) {
      this.logger.log('DWS Hub OIDC is enabled');
    } else {
      this.logger.warn(
        'DWS Hub OIDC is disabled: set OIDC_DISCOVERY_URL, OIDC_CLIENT_ID, and OIDC_REDIRECT_URI on the API, then recreate the container',
      );
    }
  }

  isConfigured(): boolean {
    const discoveryUrl = this.getDiscoveryUrl();
    const clientId = this.getClientId();
    const redirectUri = this.getConfiguredRedirectUri();
    return Boolean(
      discoveryUrl &&
        clientId &&
        redirectUri &&
        !isPlaceholderHost(discoveryUrl) &&
        !isPlaceholderHost(redirectUri),
    );
  }

  /** Post-login send-to URL: origin of OIDC_REDIRECT_URI (no separate FRONTEND_URL). */
  getFrontendUrl(req?: any): string {
    const redirectUri = this.getConfiguredRedirectUri();
    if (redirectUri) {
      return originFromUrl(redirectUri);
    }
    const fromReq = req ? publicOrigin(req) : null;
    if (fromReq) {
      return fromReq;
    }
    return 'http://localhost:3000';
  }

  getRedirectUri(req?: any): string {
    const configured = this.getConfiguredRedirectUri();
    if (configured) {
      return requireSingleUrl(configured, 'OIDC_REDIRECT_URI');
    }
    const frontend = this.getFrontendUrl(req);
    return requireSingleUrl(
      `${frontend}${defaultOidcCallbackPath(frontend)}`,
      'OIDC_REDIRECT_URI',
    );
  }

  /**
   * Token-exchange redirect_uri must match Hub's registered URI.
   * OIDC_REDIRECT_URI is the source of truth; the live callback URL is the fallback.
   */
  getTokenRedirectUri(req?: any): string {
    const configured = this.getConfiguredRedirectUri();
    if (configured && !isLoopbackHost(configured)) {
      return requireSingleUrl(configured, 'OIDC_REDIRECT_URI');
    }
    if (req) {
      try {
        const url = publicCallbackUrl(req);
        if (!isLoopbackHost(url)) {
          return url;
        }
      } catch {
        // fall through
      }
    }
    return this.getRedirectUri(req);
  }

  private getConfiguredRedirectUri(): string {
    return (
      this.configService.get<string>('oidc.redirectUri') ||
      this.configService.get<string>('OIDC_REDIRECT_URI') ||
      ''
    ).trim();
  }

  async startLogin(req?: any): Promise<{ url: string; pkceToken: string }> {
    const meta = await this.loadMetadata();
    const { codeVerifier, codeChallenge } = createPkcePair();
    const state = randomUrlSafe(24);
    const nonce = randomUrlSafe(24);
    const clientId = this.getClientId();
    const redirectUri = this.getRedirectUri(req);
    this.logger.log(`OIDC authorize redirect_uri=${redirectUri}`);
    const scope = this.getScopes();

    const url = buildAuthorizeUrl(meta.authorization_endpoint, {
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    });

    const pkceToken = this.jwtService.sign(
      {
        purpose: 'oidc_pkce',
        state,
        nonce,
        codeVerifier,
      } satisfies PkceCookiePayload,
      { expiresIn: PKCE_JWT_EXPIRES },
    );

    return { url, pkceToken };
  }

  async exchangeSpInitiated(
    code: string,
    state: string | undefined,
    pkceJwt: string | undefined,
    req?: any,
  ): Promise<OidcClaims> {
    if (!pkceJwt) {
      throw new Error('missing PKCE session (start login from /auth/oidc/login)');
    }
    const pkce = this.readPkceCookie(pkceJwt);
    if (!state || state !== pkce.state) {
      throw new Error('mismatching_state');
    }
    const claims = await this.exchangeAndVerify(code, pkce.codeVerifier, req);
    if (claims.nonce && claims.nonce !== pkce.nonce) {
      throw new Error('mismatching_nonce');
    }
    return claims;
  }

  async exchangeIdpInitiated(
    code: string,
    codeVerifier: string,
    req?: any,
  ): Promise<OidcClaims> {
    return this.exchangeAndVerify(code, codeVerifier, req);
  }

  private readPkceCookie(token: string): PkceCookiePayload {
    const payload = this.jwtService.verify<PkceCookiePayload>(token);
    if (payload?.purpose !== 'oidc_pkce' || !payload.codeVerifier || !payload.state) {
      throw new Error('invalid PKCE session');
    }
    return payload;
  }

  private async exchangeAndVerify(
    code: string,
    codeVerifier: string,
    req?: any,
  ): Promise<OidcClaims> {
    const meta = await this.loadMetadata();
    const redirectUri = this.getTokenRedirectUri(req);
    this.logger.log(`OIDC token redirect_uri=${redirectUri}`);
    const body = buildTokenRequestBody({
      code,
      redirectUri,
      clientId: this.getClientId(),
      codeVerifier,
    });

    // Hub requires a JSON body. Form-encoding returns unsupported_grant_type.
    const resp = await axios.post(meta.token_endpoint, body, {
      timeout: HUB_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      validateStatus: () => true,
    });

    if (resp.status !== 200) {
      const errText =
        typeof resp.data === 'string' ? resp.data.slice(0, 500) : JSON.stringify(resp.data).slice(0, 500);
      throw new Error(`token endpoint ${resp.status}: ${errText}`);
    }

    const idToken = resp.data?.id_token;
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('no id_token in token response');
    }

    return this.verifyIdToken(idToken, meta);
  }

  private async verifyIdToken(idToken: string, meta: OidcMetadata): Promise<OidcClaims> {
    if (!this.jwks || this.jwksUri !== meta.jwks_uri) {
      this.jwks = createRemoteJWKSet(new URL(meta.jwks_uri));
      this.jwksUri = meta.jwks_uri;
    }

    const { payload } = await jwtVerify(idToken, this.jwks, {
      issuer: meta.issuer,
      audience: this.getClientId(),
      algorithms: ['RS256'],
    });

    if (!payload.sub) {
      throw new Error('id_token missing sub');
    }
    return payload as OidcClaims;
  }

  private async loadMetadata(): Promise<OidcMetadata> {
    const now = Date.now();
    if (this.metadata && now - this.metadataFetchedAt < METADATA_TTL_MS) {
      return this.metadata;
    }

    const discoveryUrl = this.getDiscoveryUrl();
    if (!discoveryUrl || isPlaceholderHost(discoveryUrl)) {
      throw new Error('OIDC_DISCOVERY_URL is not configured');
    }

    const resp = await axios.get(discoveryUrl, {
      timeout: HUB_TIMEOUT_MS,
      validateStatus: () => true,
    });
    if (resp.status !== 200) {
      throw new Error(`OIDC discovery failed: HTTP ${resp.status}`);
    }

    const data = resp.data || {};
    if (
      !data.issuer ||
      !data.authorization_endpoint ||
      !data.token_endpoint ||
      !data.jwks_uri
    ) {
      throw new Error('OIDC discovery document is missing required fields');
    }

    this.metadata = {
      issuer: data.issuer,
      authorization_endpoint: data.authorization_endpoint,
      token_endpoint: data.token_endpoint,
      jwks_uri: data.jwks_uri,
    };
    this.metadataFetchedAt = now;
    return this.metadata;
  }

  private getDiscoveryUrl(): string {
    return (
      this.configService.get<string>('oidc.discoveryUrl') ||
      this.configService.get<string>('OIDC_DISCOVERY_URL') ||
      ''
    ).trim();
  }

  private getClientId(): string {
    return (
      this.configService.get<string>('oidc.clientId') ||
      this.configService.get<string>('OIDC_CLIENT_ID') ||
      ''
    ).trim();
  }

  private getScopes(): string {
    return (
      this.configService.get<string>('oidc.scopes') ||
      this.configService.get<string>('OIDC_SCOPES') ||
      'openid email profile'
    ).trim();
  }
}
