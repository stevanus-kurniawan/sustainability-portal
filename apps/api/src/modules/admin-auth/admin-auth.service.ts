import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  type: 'admin';
  role: string;
}

const SALT_ROUNDS = 10;
const ADMIN_ACCESS_TOKEN_COOKIE = 'admin_access_token';

/** Parse JWT expiry string (e.g. "15m", "1h", "7d") to seconds. */
function parseExpiryToSeconds(expiresIn: string): number {
  const match = /^(\d+)(m|h|d|s)$/.exec(expiresIn.trim().toLowerCase());
  if (!match) return 15 * 60; // default 15 min
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 15 * 60;
  }
}

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string; admin: { id: string; email: string; role: string }; expiresIn: number }> {
    const normalizedEmail = email.trim().toLowerCase();
    const admin = await this.prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    if (!admin || admin.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      type: 'admin',
      role: admin.role,
    };

    const secret = this.configService.get<string>('JWT_ADMIN_SECRET') ?? this.configService.get<string>('jwt.adminSecret');
    const expiresInStr = this.configService.get<string>('JWT_ADMIN_EXPIRES_IN') ?? this.configService.get<string>('jwt.adminExpiresIn') ?? '1h';

    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: expiresInStr,
    });

    const expiresInSeconds = parseExpiryToSeconds(expiresInStr);
    return {
      accessToken,
      admin: { id: admin.id, email: admin.email, role: admin.role },
      expiresIn: expiresInSeconds,
    };
  }

  async validateAdminPayload(payload: AdminJwtPayload): Promise<any> {
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Invalid token type');
    }
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
    });
    if (!admin || admin.status !== 'ACTIVE') {
      throw new UnauthorizedException('Admin not found or inactive');
    }
    return admin;
  }
}
