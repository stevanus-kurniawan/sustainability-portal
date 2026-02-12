import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notification-engine/email.service';

describe('AuthService (registration domain restriction)', () => {
  let service: AuthService;
  let configService: ConfigService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    role: { findUnique: jest.Mock };
    userRole: { create: jest.Mock };
    auditLog: { create: jest.Mock };
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hash',
    status: 'PENDING_VERIFICATION',
    emailVerified: false,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [],
  };

  async function createService(domainRestrictionEnabled: boolean) {
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockUser),
      },
      role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1' }) },
      userRole: { create: jest.fn().mockResolvedValue(undefined) },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    prisma = mockPrisma as any;

    const mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'registration.domainRestrictionEnabled')
          return domainRestrictionEnabled;
        if (key === 'APP_BASE_URL' || key === 'WEB_URL') return 'http://localhost:3000';
        if (key === 'JWT_SECRET') return 'test-secret';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: {} },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('fake-jwt-token') },
        },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: EmailService,
          useValue: { sendEmail: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
    return service;
  }

  it('rejects non-@energi-up.com email when domain restriction is enabled (production)', async () => {
    await createService(true);
    await expect(
      service.register('Test User', 'other@example.com', 'ValidPass1!@#'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.register('Test User', 'other@example.com', 'ValidPass1!@#'),
    ).rejects.toThrow('Only @energi-up.com email addresses are allowed to register.');
  });

  it('allows any email when domain restriction is disabled (dev/local)', async () => {
    await createService(false);
    const result = await service.register(
      'Test User',
      'dev@example.com',
      'ValidPass1!@#',
    );
    expect(result).toEqual({ message: 'Verification email sent. Link expires in 15 minutes.' });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'dev@example.com',
          name: 'Test User',
        }),
      }),
    );
  });

  it('allows @energi-up.com email when domain restriction is enabled', async () => {
    await createService(true);
    const result = await service.register(
      'Jane Doe',
      'jane.doe@energi-up.com',
      'ValidPass1!@#',
    );
    expect(result).toEqual({ message: 'Verification email sent. Link expires in 15 minutes.' });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'jane.doe@energi-up.com',
          name: 'Jane Doe',
        }),
      }),
    );
  });
});
