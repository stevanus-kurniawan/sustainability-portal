import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
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
   * Validate user by email (for SSO/OIDC integration)
   * Creates user if not exists (JIT provisioning)
   */
  async validateOrCreateUser(email: string, name?: string): Promise<any> {
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Just-In-Time user provisioning
      user = await this.prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          status: 'ACTIVE',
        },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Assign default PublicReader role
      const publicReaderRole = await this.prisma.role.findUnique({
        where: { name: 'PublicReader' },
      });

      if (publicReaderRole) {
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: publicReaderRole.id,
          },
        });
      }

      this.logger.log(`Created new user via JIT: ${email}`);
    }

    return user;
  }

  /**
   * Login by email (for development/testing or SSO callback)
   */
  async loginByEmail(email: string): Promise<TokenResponse> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    // Log audit
    await this.logAudit(email, 'LOGIN', 'User', user.id);

    return this.generateTokens(user);
  }

  /**
   * Refresh tokens using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Check if refresh token exists in database
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
                        include: {
                          permission: true,
                        },
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

      // Delete old refresh token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Generate new tokens
      return this.generateTokens(storedToken.user);
    } catch (error) {
      this.logger.error(`Refresh token error: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user (invalidate tokens)
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (refreshToken) {
      // Delete specific refresh token
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } else {
      // Delete all refresh tokens for user
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }

    // Log audit
    await this.logAudit(user.email, 'LOGOUT', 'User', userId);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: any): Promise<TokenResponse> {
    const roles = user.userRoles?.map((ur: any) => ur.role.name) || [];
    const permissions = new Set<string>();

    for (const userRole of user.userRoles || []) {
      for (const rp of userRole.role.rolePermissions || []) {
        permissions.add(rp.permission.code);
      }
    }

    const permissionsList = Array.from(permissions);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions: permissionsList,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

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
      expiresIn: 900, // 15 minutes in seconds
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
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  /**
   * Log audit entry
   */
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
