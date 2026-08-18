import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../notification-engine/email.service';

describe('AuthService.loginWithOidcClaims', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    role: { findUnique: jest.Mock };
    userRole: { create: jest.Mock };
    refreshToken: { create: jest.Mock };
    auditLog: { create: jest.Mock };
  };

  const userInclude = {
    id: 'user-1',
    email: 'jane@example.com',
    name: 'Jane',
    oidcSub: 'hub-sub-1',
    status: 'ACTIVE',
    emailVerified: true,
    userRoles: [],
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1' }) },
      userRole: { create: jest.fn() },
      refreshToken: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { findById: jest.fn().mockResolvedValue(userInclude) },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('jwt') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              if (key === 'JWT_REFRESH_SECRET' || key === 'jwt.refreshSecret') return 'refresh';
              if (key === 'JWT_EXPIRES_IN') return '1h';
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              return fallback;
            }),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('rejects missing sub', async () => {
    await expect(service.loginWithOidcClaims({ email: 'a@b.c' })).rejects.toThrow(
      /no subject/,
    );
  });

  it('finds an existing user by oidcSub', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(userInclude);
    const result = await service.loginWithOidcClaims({
      sub: 'hub-sub-1',
      email: 'jane@example.com',
    });
    expect(result.user.email).toBe('jane@example.com');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('JIT-creates a user when sub and email are new', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // by oidcSub
      .mockResolvedValueOnce(null); // by email
    prisma.user.create.mockResolvedValue({ ...userInclude, userRoles: [] });

    const result = await service.loginWithOidcClaims({
      sub: 'hub-sub-1',
      email: 'jane@example.com',
      name: 'Jane',
    });
    expect(prisma.user.create).toHaveBeenCalled();
    expect(result.accessToken).toBe('jwt');
  });

  it('rejects suspended accounts', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      ...userInclude,
      status: 'SUSPENDED',
    });
    await expect(
      service.loginWithOidcClaims({ sub: 'hub-sub-1', email: 'jane@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
