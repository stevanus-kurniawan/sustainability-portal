import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}

/**
 * Future: Keycloak OIDC Integration
 *
 * To extend this auth module for Keycloak OIDC:
 *
 * 1. Install dependencies:
 *    pnpm add @nestjs/passport passport-openidconnect
 *
 * 2. Create KeycloakStrategy:
 *    ```typescript
 *    @Injectable()
 *    export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
 *      constructor(configService: ConfigService) {
 *        super({
 *          issuer: `${configService.get('KEYCLOAK_AUTH_SERVER_URL')}/realms/${configService.get('KEYCLOAK_REALM')}`,
 *          authorizationURL: `${configService.get('KEYCLOAK_AUTH_SERVER_URL')}/realms/${configService.get('KEYCLOAK_REALM')}/protocol/openid-connect/auth`,
 *          tokenURL: `${configService.get('KEYCLOAK_AUTH_SERVER_URL')}/realms/${configService.get('KEYCLOAK_REALM')}/protocol/openid-connect/token`,
 *          userInfoURL: `${configService.get('KEYCLOAK_AUTH_SERVER_URL')}/realms/${configService.get('KEYCLOAK_REALM')}/protocol/openid-connect/userinfo`,
 *          clientID: configService.get('KEYCLOAK_CLIENT_ID'),
 *          clientSecret: configService.get('KEYCLOAK_CLIENT_SECRET'),
 *          callbackURL: configService.get('KEYCLOAK_CALLBACK_URL'),
 *          scope: ['openid', 'profile', 'email'],
 *        });
 *      }
 *
 *      async validate(accessToken: string, refreshToken: string, profile: any) {
 *        return { accessToken, refreshToken, profile };
 *      }
 *    }
 *    ```
 *
 * 3. Add KeycloakStrategy to providers and create /auth/keycloak endpoints
 */
