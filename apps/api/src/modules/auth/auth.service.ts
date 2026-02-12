import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { REGISTRATION_ALLOWED_DOMAIN } from './dto/register.dto';
import { EmailService } from '../notification-engine/email.service';
import {
  buildVerifyEmailHtml,
  buildVerifyEmailSubject,
  buildVerifyEmailText,
} from './templates/verify-email.template';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'user';
  roles: string[];
  permissions: string[];
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  };
}

const SALT_ROUNDS = 10;
const EMAIL_VERIFICATION_EXPIRES_IN = '15m';

type EmailVerificationPayload = {
  user_id: string;
  email: string;
  purpose: 'email_verification';
};

/** Parse JWT expiry string (e.g. "15m", "1h", "7d") to seconds. */
function parseExpiryToSeconds(expiresIn: string): number {
  const match = /^(\d+)(m|h|d|s)$/.exec(expiresIn.trim().toLowerCase());
  if (!match) return 60 * 60; // default 1h
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 60 * 60;
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Register a new user. In production, email must end with @energi-up.com;
   * in dev/local the domain restriction is not applied.
   */
  async register(
    fullName: string,
    email: string,
    password: string,
  ): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const domainRestrictionEnabled = this.configService.get<boolean>(
      'registration.domainRestrictionEnabled',
    );
    if (
      domainRestrictionEnabled &&
      !normalizedEmail.endsWith(REGISTRATION_ALLOWED_DOMAIN)
    ) {
      throw new BadRequestException(
        'Only @energi-up.com email addresses are allowed to register.',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Basic password hardening guard (in addition to DTO validation)
    const weakPasswords = [
      'password',
      'password123',
      '12345678',
      '123456789',
      'qwerty123',
      'admin123',
    ];
    if (weakPasswords.includes(password.toLowerCase())) {
      throw new BadRequestException(
        'Password is too common. Please choose a stronger password.',
      );
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: fullName.trim(),
        passwordHash,
        status: 'PENDING_VERIFICATION' as any,
        // cast to any so we can use newly added columns before Prisma client is regenerated
        ...(true && ({
          emailVerified: false,
          emailVerifiedAt: null,
        } as any)),
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    const publicReaderRole = await this.prisma.role.findUnique({
      where: { name: 'PublicReader' },
    });
    if (publicReaderRole) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: publicReaderRole.id },
      });
    }

    await this.sendEmailVerificationLink(user.id, normalizedEmail);
    await this.logAudit(normalizedEmail, 'REGISTER', 'User', user.id);
    return { message: 'Verification email sent. Link expires in 15 minutes.' };
  }

  /**
   * Login with email and password. Returns tokens; controller sets cookie.
   */
  async login(email: string, password: string): Promise<TokenResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = (await this.usersService.findByEmail(normalizedEmail)) as any;

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified || user.status !== ('ACTIVE' as any)) {
      throw new UnauthorizedException({
        message: 'Please verify your email before logging in.',
        canResendVerification: true,
      });
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.logAudit(user.email, 'LOGIN', 'User', user.id);
    return this.generateTokens(user);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify<EmailVerificationPayload>(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      if (payload?.purpose !== 'email_verification') {
        throw new Error('Invalid token purpose');
      }

      const user = (await this.prisma.user.findUnique({
        where: { id: payload.user_id },
      })) as any;

      if (!user || user.email !== payload.email) {
        throw new Error('User not found');
      }

      // Idempotent: if already verified and active, do not error
      if (user.emailVerified && user.status === ('ACTIVE' as any)) {
        return { message: 'Email already verified.' };
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          ...(true && ({
            emailVerified: true,
            emailVerifiedAt: new Date(),
          } as any)),
          status: 'ACTIVE' as any,
        } as any,
      });

      await this.logAudit(user.email, 'VERIFY_EMAIL', 'User', user.id);
      return { message: 'Email verified successfully.' };
    } catch (e) {
      this.logger.warn(
        `Email verification failed: ${(e as Error).message || e} `,
      );
      throw new BadRequestException(
        'Verification link expired or invalid. Please request a new one.',
      );
    }
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    // Always return generic success (do not reveal account existence)
    const genericResponse = {
      message: 'If your email exists, verification link sent.',
    };

    const user = (await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })) as any;

    if (!user || user.emailVerified) {
      return genericResponse;
    }

    await this.sendEmailVerificationLink(user.id, user.email);
    await this.logAudit(user.email, 'RESEND_VERIFICATION', 'User', user.id);
    return genericResponse;
  }

  async changeEmail(
    currentEmail: string,
    newEmail: string,
  ): Promise<{ message: string }> {
    const oldEmail = currentEmail.trim().toLowerCase();
    const nextEmail = newEmail.trim().toLowerCase();

    const genericResponse = {
      message:
        'If your account is eligible, a new verification link has been sent.',
    };

    if (!oldEmail || !nextEmail) {
      return genericResponse;
    }

    const user = (await this.prisma.user.findUnique({
      where: { email: oldEmail },
    })) as any;

    if (
      !user ||
      user.emailVerified ||
      user.status !== ('PENDING_VERIFICATION' as any)
    ) {
      return genericResponse;
    }

    const existingTarget = await this.prisma.user.findUnique({
      where: { email: nextEmail },
    });
    if (existingTarget && existingTarget.id !== user.id) {
      throw new BadRequestException(
        'This email is already associated with another account.',
      );
    }

    const updated = (await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: nextEmail,
        ...(true && ({
          emailVerified: false,
          emailVerifiedAt: null,
        } as any)),
        status: 'PENDING_VERIFICATION' as any,
      } as any,
    })) as any;

    await this.sendEmailVerificationLink(updated.id, updated.email);
    await this.logAudit(
      updated.email,
      'CHANGE_EMAIL_BEFORE_VERIFICATION',
      'User',
      updated.id,
      { previousEmail: oldEmail },
    );

    return genericResponse;
  }

  private createEmailVerificationToken(params: {
    userId: string;
    email: string;
  }): string {
    const payload: EmailVerificationPayload = {
      user_id: params.userId,
      email: params.email,
      purpose: 'email_verification',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: EMAIL_VERIFICATION_EXPIRES_IN,
    });
  }

  private async sendEmailVerificationLink(
    userId: string,
    email: string,
  ): Promise<void> {
    const token = this.createEmailVerificationToken({ userId, email });
    const appBaseUrl =
      this.configService.get('APP_BASE_URL') ||
      this.configService.get('WEB_URL', 'http://localhost:3000');
    const verifyUrl = `${String(appBaseUrl).replace(/\/$/, '')}/auth/verify-email?token=${encodeURIComponent(token)}`;

    const ok = await this.emailService.sendEmail({
      to: email,
      subject: buildVerifyEmailSubject(),
      text: buildVerifyEmailText({ verifyUrl }),
      html: buildVerifyEmailHtml({ verifyUrl }),
    });

    if (!ok) {
      this.logger.error(
        `Failed to send verification email to ${email}. Check SMTP configuration and logs from EmailService.`,
      );
    }
  }

  /**
   * Refresh tokens using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: {
            include: {
              userRoles: {
                include: {
                  role: {
                    include: {
                      rolePermissions: {
                        include: { permission: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      return this.generateTokens(storedToken.user);
    } catch (error) {
      this.logger.error(`Refresh token error: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user (invalidate refresh tokens). Controller clears cookie.
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    await this.logAudit(user.email, 'LOGOUT', 'User', userId);
  }

  /**
   * Generate access and refresh tokens for user
   */
  private async generateTokens(user: any): Promise<TokenResponse> {
    const roles = user.userRoles?.map((ur: any) => ur.role.name) || [];
    const permissions = new Set<string>();
    for (const userRole of user.userRoles || []) {
      for (const rp of userRole.role?.rolePermissions || []) {
        permissions.add(rp.permission.code);
      }
    }
    const permissionsList = Array.from(permissions);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'user',
      roles,
      permissions: permissionsList,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const accessExpiresInStr = this.configService.get('JWT_EXPIRES_IN', '1h');
    const expiresInSeconds = parseExpiryToSeconds(accessExpiresInStr);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        permissions: permissionsList,
      },
    };
  }

  /**
   * Validate JWT payload and return user
   */
  async validateJwtPayload(payload: JwtPayload): Promise<any> {
    if (payload.type !== 'user') {
      throw new UnauthorizedException('Invalid token type');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  private async logAudit(
    userEmail: string,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userEmail,
          action,
          entityType,
          entityId,
          metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log audit: ${error.message}`);
    }
  }
}
