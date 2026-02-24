import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

const SALT_ROUNDS = 10;
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;
const ADMIN_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export interface AuditActor {
  adminId: string;
  adminEmail: string;
  adminRole: string;
}

@Injectable()
export class AdminAdminsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async list() {
    const admins = await this.prisma.admin.findMany({
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { data: admins };
  }

  async getById(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }
    return admin;
  }

  async create(
    dto: CreateAdminDto,
    actor: AuditActor,
    ip?: string,
    userAgent?: string,
  ) {
    if (actor.adminRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can create admins');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.admin.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('An admin with this email already exists');
    }

    const role = (dto.role && ADMIN_ROLES.includes(dto.role as any)) ? dto.role : 'ADMIN';
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, SALT_ROUNDS);

    const admin = await this.prisma.admin.create({
      data: {
        email,
        name: dto.name?.trim() || null,
        passwordHash,
        role,
        status: 'ACTIVE',
      },
    });

    const after = this.snapshotAdmin(admin);
    await this.auditLogs.createAdminAudit({
      userEmail: actor.adminEmail,
      actorAdminId: actor.adminId,
      action: 'CREATE',
      entityType: 'admin',
      entityId: admin.id,
      afterJson: after,
      ip,
      userAgent,
    });

    return this.getById(admin.id);
  }

  async update(
    id: string,
    dto: UpdateAdminDto,
    actor: AuditActor,
    ip?: string,
    userAgent?: string,
  ) {
    if (actor.adminRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can update admins');
    }

    const existing = await this.prisma.admin.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    if (dto.role && !ADMIN_ROLES.includes(dto.role as any)) {
      throw new BadRequestException(`Role must be one of: ${ADMIN_ROLES.join(', ')}`);
    }
    if (dto.status && !ADMIN_STATUSES.includes(dto.status as any)) {
      throw new BadRequestException(`Status must be one of: ${ADMIN_STATUSES.join(', ')}`);
    }

    await this.ensureNotLastSuperAdmin(existing, dto, id);

    const before = this.snapshotAdmin(existing);

    const updated = await this.prisma.admin.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name?.trim() || null }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    const after = this.snapshotAdmin(updated);
    await this.auditLogs.createAdminAudit({
      userEmail: actor.adminEmail,
      actorAdminId: actor.adminId,
      action: 'UPDATE',
      entityType: 'admin',
      entityId: id,
      beforeJson: before,
      afterJson: after,
      ip,
      userAgent,
    });

    return this.getById(id);
  }

  /** Prevent locking out: cannot disable or downgrade the last active SUPER_ADMIN. */
  private async ensureNotLastSuperAdmin(
    admin: { id: string; email: string; role: string; status: string },
    dto: UpdateAdminDto,
    targetId: string,
  ): Promise<void> {
    if (admin.role !== 'SUPER_ADMIN') return;

    const willDisable = dto.status === 'INACTIVE';
    const willDowngrade = dto.role === 'ADMIN';

    if (!willDisable && !willDowngrade) return;

    const otherSuperAdmins = await this.prisma.admin.count({
      where: {
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        id: { not: targetId },
      },
    });

    if (otherSuperAdmins === 0) {
      throw new ForbiddenException(
        'Cannot disable or downgrade the last active SUPER_ADMIN. Ensure at least one other SUPER_ADMIN exists.',
      );
    }
  }

  private snapshotAdmin(admin: { id: string; email: string; name: string | null; role: string; status: string }) {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      status: admin.status,
    };
  }
}
