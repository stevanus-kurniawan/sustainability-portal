import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AdminAuthService, AdminJwtPayload } from '../admin-auth.service';

const ADMIN_ACCESS_TOKEN_COOKIE = 'admin_access_token';

function extractAdminJwtFromCookie(req: Request): string | null {
  return req?.cookies?.[ADMIN_ACCESS_TOKEN_COOKIE] ?? null;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService,
    private adminAuthService: AdminAuthService,
  ) {
    const secret = configService.get<string>('JWT_ADMIN_SECRET') ?? configService.get<string>('jwt.adminSecret');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => extractAdminJwtFromCookie(req),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: AdminJwtPayload) {
    const admin = await this.adminAuthService.validateAdminPayload(payload);
    if (!admin) {
      throw new UnauthorizedException();
    }
    return admin;
  }
}
