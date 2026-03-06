import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuthService } from '../auth/auth.service';
import {
  clampPagination,
  paginationMeta,
  wrapPaginated,
} from '../../common/response';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { UserStatus } from '@prisma/client';
import { UpdateUserDto } from '../users/dto/update-user.dto';

const ALLOWED_USER_ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'];
const SALT_ROUNDS = 10;

export interface AdminListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditActor {
  adminId: string;
  adminEmail: string;
  adminRole: string;
}

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private auditLogs: AuditLogsService,
    private authService: AuthService,
  ) {}

  async list(params: AdminListUsersParams) {
    const { page, pageSize } = clampPagination(params.page, params.pageSize);
    const search = params.search?.trim();
    const roleName = params.role?.trim();
    const status = params.status;
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleName) {
      where.userRoles = {
        some: {
          role: { name: roleName },
        },
      };
    }

    const orderBy: Record<string, string> = {};
    const allowedSort = ['createdAt', 'updatedAt', 'email', 'name', 'status'];
    if (allowedSort.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          userRoles: {
            include: { role: { select: { id: true, name: true } } },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      status: u.status,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      roles: u.userRoles.map((ur) => ur.role.name),
    }));

    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async getById(id: string) {
    const user = await this.usersService.findById(id);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }

  async createUser(
    dto: AdminCreateUserDto,
    actor: AuditActor,
    ip?: string,
    userAgent?: string,
  ) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const roles = dto.roles?.length ? dto.roles : ['USER'];
    const hasSuperAdmin = roles.includes('SUPER_ADMIN');
    if (hasSuperAdmin && actor.adminRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can assign SUPER_ADMIN role to users');
    }
    for (const r of roles) {
      if (!ALLOWED_USER_ROLES.includes(r)) {
        throw new BadRequestException(
          `Role must be one of: ${ALLOWED_USER_ROLES.join(', ')}`,
        );
      }
    }

    const sendVerificationEmail = dto.sendVerificationEmail !== false;
    const status: UserStatus = sendVerificationEmail
      ? ('PENDING_VERIFICATION' as UserStatus)
      : (dto.status ?? ('ACTIVE' as UserStatus));
    const emailVerified = !sendVerificationEmail;
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash,
        status,
        emailVerified,
        emailVerifiedAt: emailVerified ? new Date() : null,
      } as any,
    });

    if (roles.length > 0) {
      await this.usersService.assignRoles(user.id, roles);
    }

    let verificationEmailSent = false;
    if (sendVerificationEmail) {
      try {
        await this.authService.sendVerificationEmailForUser(user.id, email);
        verificationEmailSent = true;
      } catch {
        // Log but do not fail user creation; audit will record that email was not sent
      }
    }

    const after = this.snapshotUser(await this.usersService.findById(user.id));
    await this.auditLogs.createAdminAudit({
      userEmail: actor.adminEmail,
      actorAdminId: actor.adminId,
      action: 'CREATE',
      entityType: 'user',
      entityId: user.id,
      afterJson: after,
      metadata: sendVerificationEmail ? { verificationEmailSent } : undefined,
      ip,
      userAgent,
    });

    return this.getById(user.id);
  }

  async update(
    id: string,
    dto: AdminUpdateUserDto,
    actor: AuditActor,
    ip?: string,
    userAgent?: string,
  ) {
    const existing = await this.usersService.findById(id);
    const before = this.snapshotUser(existing);

    if (dto.roles !== undefined && dto.roles.includes('SUPER_ADMIN') && actor.adminRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can assign SUPER_ADMIN role to users',
      );
    }

    await this.usersService.update(id, dto as UpdateUserDto);
    const updated = await this.usersService.findById(id);
    const after = this.snapshotUser(updated);

    await this.auditLogs.createAdminAudit({
      userEmail: actor.adminEmail,
      actorAdminId: actor.adminId,
      action: 'UPDATE',
      entityType: 'user',
      entityId: id,
      beforeJson: before,
      afterJson: after,
      ip,
      userAgent,
    });

    return this.getById(id);
  }

  async updateRole(
    id: string,
    role: string,
    actor: AuditActor,
    ip?: string,
    userAgent?: string,
  ) {
    if (!ALLOWED_USER_ROLES.includes(role)) {
      throw new BadRequestException(
        `Role must be one of: ${ALLOWED_USER_ROLES.join(', ')}`,
      );
    }
    if (role === 'SUPER_ADMIN' && actor.adminRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can assign SUPER_ADMIN role to users',
      );
    }

    const existing = await this.usersService.findById(id);
    const before = this.snapshotUser(existing);

    await this.usersService.update(id, { roles: [role] });
    const updated = await this.usersService.findById(id);
    const after = this.snapshotUser(updated);

    await this.auditLogs.createAdminAudit({
      userEmail: actor.adminEmail,
      actorAdminId: actor.adminId,
      action: 'UPDATE_ROLE',
      entityType: 'user',
      entityId: id,
      beforeJson: before,
      afterJson: after,
      metadata: { role },
      ip,
      userAgent,
    });

    return this.getById(id);
  }

  async updateStatus(
    id: string,
    status: UserStatus,
    actor: AuditActor,
    ip?: string,
    userAgent?: string,
  ) {
    const existing = await this.usersService.findById(id);
    const before = this.snapshotUser(existing);

    await this.usersService.update(id, { status } as UpdateUserDto);
    const updated = await this.usersService.findById(id);
    const after = this.snapshotUser(updated);

    await this.auditLogs.createAdminAudit({
      userEmail: actor.adminEmail,
      actorAdminId: actor.adminId,
      action: 'UPDATE_STATUS',
      entityType: 'user',
      entityId: id,
      beforeJson: before,
      afterJson: after,
      metadata: { status },
      ip,
      userAgent,
    });

    return this.getById(id);
  }

  async updateEmailVerification(
    id: string,
    emailVerified: boolean,
    actor: AuditActor,
    ip?: string,
    userAgent?: string,
  ) {
    const existing = await this.usersService.findById(id);
    const before = this.snapshotUser(existing);

    await this.prisma.user.update({
      where: { id },
      data: {
        emailVerified,
        emailVerifiedAt: emailVerified ? new Date() : null,
      },
    });
    const updated = await this.usersService.findById(id);
    const after = this.snapshotUser(updated);

    await this.auditLogs.createAdminAudit({
      userEmail: actor.adminEmail,
      actorAdminId: actor.adminId,
      action: 'UPDATE_EMAIL_VERIFICATION',
      entityType: 'user',
      entityId: id,
      beforeJson: before,
      afterJson: after,
      metadata: { emailVerified },
      ip,
      userAgent,
    });

    return this.getById(id);
  }

  private snapshotUser(user: {
    id: string;
    email: string;
    name: string;
    status: string;
    emailVerified?: boolean;
    emailVerifiedAt?: Date | null;
    userRoles: { role: { name: string } }[];
  }): Record<string, unknown> {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }
}
