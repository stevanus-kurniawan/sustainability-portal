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
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { REGISTRATION_ALLOWED_DOMAIN } from './dto/register.dto';
import { EmailService } from '../notification-engine/email.service';
import {
  buildVerifyEmailHtml,
  buildVerifyEmailSubject,
  buildVerifyEmailText,
} from './templates/verify-email.template';
import {
  buildResetPasswordHtml,
  buildResetPasswordSubject,
  buildResetPasswordText,
} from './templates/reset-password.template';

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
const PASSWORD_RESET_EXPIRY_HOURS = 1;

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

  /**
   * Verify email with token. On success, marks user ACTIVE and returns tokens so the user can be auto-logged in.
   */
  async verifyEmail(token: string): Promise<{ message: string } | (TokenResponse & { message: string })> {
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

      // Idempotent: if already verified and active, sign in and return tokens
      if (user.emailVerified && user.status === ('ACTIVE' as any)) {
        const fullUser = await this.usersService.findById(user.id);
        const tokens = await this.generateTokens(fullUser);
        return { message: 'Email already verified.', ...tokens };
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

      const fullUser = await this.usersService.findById(user.id);
      const tokens = await this.generateTokens(fullUser);
      return { message: 'Email verified successfully.', ...tokens };
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

  /**
   * Forgot password: send single-use reset link. Always returns generic success.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const genericResponse = {
      message: 'If an account exists with this email, a password reset link has been sent.',
    };

    const user = (await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })) as any;

    if (!user || user.status !== ('ACTIVE' as any)) {
      return genericResponse;
    }

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRY_HOURS);

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    const appBaseUrl =
      this.configService.get('APP_BASE_URL') ||
      this.configService.get('WEB_URL', 'http://localhost:3000');
    const resetUrl = `${String(appBaseUrl).replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(token)}`;

    const ok = await this.emailService.sendEmail({
      to: normalizedEmail,
      subject: buildResetPasswordSubject(),
      text: buildResetPasswordText({ resetUrl }),
      html: buildResetPasswordHtml({ resetUrl, webUrl: appBaseUrl }),
    });

    if (!ok) {
      this.logger.error(
        `Failed to send password reset email. Check SMTP configuration.`,
      );
    }

    await this.logAudit(normalizedEmail, 'FORGOT_PASSWORD', 'User', user.id);
    return genericResponse;
  }

  /**
   * Reset password: verify single-use token, update password, invalidate token.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token || typeof token !== 'string' || token.length < 32) {
      throw new BadRequestException(
        'Reset link expired or invalid. Please request a new password reset.',
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException(
        'Reset link expired or invalid. Please request a new password reset.',
      );
    }

    const weakPasswords = [
      'password',
      'password123',
      '12345678',
      '123456789',
      'qwerty123',
      'admin123',
    ];
    if (weakPasswords.includes(newPassword.toLowerCase())) {
      throw new BadRequestException(
        'Password is too common. Please choose a stronger password.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.delete({
        where: { id: resetRecord.id },
      }),
    ]);

    await this.logAudit(
      resetRecord.user.email,
      'RESET_PASSWORD',
      'User',
      resetRecord.userId,
    );

    return { message: 'Password has been reset. You can now log in.' };
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
      html: buildVerifyEmailHtml({ verifyUrl, webUrl: appBaseUrl }),
    });

    if (!ok) {
      this.logger.error(
        `Failed to send verification email to ${email}. Check SMTP configuration and logs from EmailService.`,
      );
      throw new BadRequestException(
        'Failed to send verification email. Please try again later or contact support.',
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
    const roles = (user.userRoles?.map((ur: any) => ur.role?.name).filter(Boolean) || []) as string[];
    const permissions = new Set<string>();
    for (const userRole of user.userRoles || []) {
      for (const rp of userRole.role?.rolePermissions || []) {
        const code = rp?.permission?.code;
        if (code) permissions.add(code);
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
    const refreshExpiresInStr = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshSecret =
      this.configService.get('JWT_REFRESH_SECRET') ?? this.configService.get('jwt.refreshSecret');
    if (!refreshSecret) {
      this.logger.error('JWT_REFRESH_SECRET (or jwt.refreshSecret) is not set; login will fail.');
      throw new BadRequestException(
        'Server auth configuration error. Please set JWT_REFRESH_SECRET in the API environment.',
      );
    }
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresInStr,
    });

    const refreshExpiresInSeconds = parseExpiryToSeconds(refreshExpiresInStr);
    const expiresAt = new Date(Date.now() + refreshExpiresInSeconds * 1000);

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
