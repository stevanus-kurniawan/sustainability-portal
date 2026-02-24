import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminAdminsService } from './admin-admins.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('AdminAdminsService', () => {
  let service: AdminAdminsService;
  let prisma: {
    admin: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditLogs: { createAdminAudit: jest.Mock };

  const superAdminActor = {
    adminId: 'admin-1',
    adminEmail: 'super@test.com',
    adminRole: 'SUPER_ADMIN',
  };

  const adminActor = {
    adminId: 'admin-2',
    adminEmail: 'admin@test.com',
    adminRole: 'ADMIN',
  };

  beforeEach(async () => {
    auditLogs = { createAdminAudit: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      admin: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAdminsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get<AdminAdminsService>(AdminAdminsService);
  });

  describe('create', () => {
    it('throws ForbiddenException when actor is not SUPER_ADMIN', async () => {
      await expect(
        service.create(
          {
            email: 'new@test.com',
            temporaryPassword: 'password123',
            role: 'ADMIN',
          },
          adminActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update (last SUPER_ADMIN guard)', () => {
    it('throws ForbiddenException when disabling the last active SUPER_ADMIN', async () => {
      const target = {
        id: 'target-1',
        email: 'only-super@test.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        name: null as string | null,
      };
      prisma.admin.findUnique.mockResolvedValue(target);
      prisma.admin.count.mockResolvedValue(0);

      await expect(
        service.update(
          'target-1',
          { status: 'INACTIVE' },
          superAdminActor,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.admin.update).not.toHaveBeenCalled();
    });

    it('allows disabling when another active SUPER_ADMIN exists', async () => {
      const target = {
        id: 'target-1',
        email: 'one-super@test.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = { ...target, status: 'INACTIVE' };
      prisma.admin.findUnique
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce(updated);
      prisma.admin.count.mockResolvedValue(1);
      prisma.admin.update.mockResolvedValue(updated);

      const result = await service.update(
        'target-1',
        { status: 'INACTIVE' },
        superAdminActor,
      );

      expect(prisma.admin.update).toHaveBeenCalled();
      expect(result.status).toBe('INACTIVE');
    });

    it('throws ForbiddenException when downgrading the last SUPER_ADMIN to ADMIN', async () => {
      const target = {
        id: 'target-1',
        email: 'only-super@test.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        name: null as string | null,
      };
      prisma.admin.findUnique.mockResolvedValue(target);
      prisma.admin.count.mockResolvedValue(0);

      await expect(
        service.update('target-1', { role: 'ADMIN' }, superAdminActor),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.admin.update).not.toHaveBeenCalled();
    });
  });

  describe('update (not found)', () => {
    it('throws NotFoundException when admin does not exist', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Foo' }, superAdminActor),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
