import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from '../auth.service';
import { Public } from '../decorators/public.decorator';
import {
  clearOidcPkceCookie,
  OIDC_PKCE_COOKIE,
  setOidcPkceCookie,
  setUserSessionCookies,
} from '../auth-cookies';
import { OidcService } from './oidc.service';

@ApiTags('auth')
@Public()
@Controller('auth/oidc')
export class OidcController {
  private readonly logger = new Logger(OidcController.name);

  constructor(
    private readonly oidcService: OidcService,
    private readonly authService: AuthService,
  ) {}

  @Get('enabled')
  @ApiOperation({ summary: 'Whether DWS Hub OIDC is configured' })
  enabled() {
    return { enabled: this.oidcService.isConfigured() };
  }

  @Get('login')
  @ApiOperation({ summary: 'Start DWS Hub OIDC login (SP-initiated)' })
  async login(@Req() req: any, @Res() res: Response) {
    this.assertConfigured();
    const { url, pkceToken } = await this.oidcService.startLogin(req);
    setOidcPkceCookie(res, pkceToken, req);
    return res.redirect(302, url);
  }

  @Get('callback')
  @ApiOperation({ summary: 'DWS Hub OIDC callback (SP- and IdP-initiated)' })
  async callback(
    @Req() req: any,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('code_verifier') codeVerifier?: string,
    @Query('error') hubError?: string,
  ) {
    this.assertConfigured();
    const frontend = this.oidcService.getFrontendUrl(req);
    const failUrl = `${frontend}/login?error=sso-failed`;

    try {
      if (hubError) {
        this.logger.warn(`OIDC callback Hub error: ${hubError}`);
        clearOidcPkceCookie(res, req);
        return res.redirect(303, failUrl);
      }
      if (!code) {
        clearOidcPkceCookie(res, req);
        return res.redirect(303, failUrl);
      }

      // IdP-initiated (Hub tile): Hub sends code_verifier because we never ran /login.
      const claims = codeVerifier
        ? await this.oidcService.exchangeIdpInitiated(code, codeVerifier, req)
        : await this.oidcService.exchangeSpInitiated(
            code,
            state,
            req.cookies?.[OIDC_PKCE_COOKIE],
            req,
          );

      const tokens = await this.authService.loginWithOidcClaims(claims);
      clearOidcPkceCookie(res, req);
      setUserSessionCookies(res, tokens.accessToken, tokens.expiresIn, req);
      this.logger.log(`OIDC login: ${tokens.user.email}`);
      return res.redirect(303, frontend);
    } catch (exc: any) {
      this.logger.warn(
        `OIDC callback failed: ${exc?.constructor?.name || 'Error'}: ${exc?.message || exc}`,
      );
      clearOidcPkceCookie(res, req);
      return res.redirect(303, failUrl);
    }
  }

  private assertConfigured(): void {
    if (!this.oidcService.isConfigured()) {
      throw new NotFoundException(
        'DWS Hub SSO is not configured. Set OIDC_DISCOVERY_URL, OIDC_CLIENT_ID, and OIDC_REDIRECT_URI on the API service and recreate the container.',
      );
    }
  }
}
