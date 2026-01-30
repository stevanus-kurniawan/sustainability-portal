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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Register a new user. Email must end with @energi-up.com.
   */
  async register(fullName: string, email: string, password: string): Promise<Omit<TokenResponse, 'refreshToken'>> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith(REGISTRATION_ALLOWED_DOMAIN)) {
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

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: fullName.trim(),
        passwordHash,
        status: 'ACTIVE',
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

    const userWithRoles = await this.usersService.findById(user.id);
    await this.logAudit(normalizedEmail, 'REGISTER', 'User', user.id);
    return this.generateTokens(userWithRoles);
  }

  /**
   * Login with email and password. Returns tokens; controller sets cookie.
   */
  async login(email: string, password: string): Promise<TokenResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
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

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
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
