import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let usersService: { findById: jest.Mock; update: jest.Mock };
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

  const mockUser = {
    id: 'user-1',
    email: 'user@test.com',
    name: 'User',
    status: 'ACTIVE',
    userRoles: [{ role: { name: 'USER' } }],
  };

  beforeEach(async () => {
    usersService = {
      findById: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue(mockUser),
    };
    auditLogs = { createAdminAudit: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: {} },
        { provide: UsersService, useValue: usersService },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
  });

  describe('update (role assignment)', () => {
    it('allows SUPER_ADMIN to assign SUPER_ADMIN role to user', async () => {
      await service.update(
        'user-1',
        { roles: ['SUPER_ADMIN'] },
        superAdminActor,
      );
      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        roles: ['SUPER_ADMIN'],
      });
    });

    it('throws ForbiddenException when ADMIN tries to assign SUPER_ADMIN role', async () => {
      await expect(
        service.update('user-1', { roles: ['SUPER_ADMIN'] }, adminActor),
      ).rejects.toThrow(ForbiddenException);

      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('allows ADMIN to assign USER or ADMIN role', async () => {
      await service.update('user-1', { roles: ['ADMIN'] }, adminActor);
      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        roles: ['ADMIN'],
      });
    });
  });

  describe('updateRole', () => {
    it('throws ForbiddenException when ADMIN tries to set role to SUPER_ADMIN', async () => {
      await expect(
        service.updateRole('user-1', 'SUPER_ADMIN', adminActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows SUPER_ADMIN to set role to SUPER_ADMIN', async () => {
      usersService.findById.mockResolvedValue({ ...mockUser, userRoles: [{ role: { name: 'SUPER_ADMIN' } }] });
      await service.updateRole('user-1', 'SUPER_ADMIN', superAdminActor);
      expect(usersService.update).toHaveBeenCalledWith('user-1', {
        roles: ['SUPER_ADMIN'],
      });
    });
  });
});
