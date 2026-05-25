import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PlanningActivityStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toStrapiLike, wrapData } from '../../common/response';

function toDateOnly(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function parseDateOnlyUtc(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) {
    throw new BadRequestException('Invalid start or end date');
  }
  return new Date(Date.UTC(y, m - 1, d));
}

function assigneeLabel(admin: { name: string | null; email: string } | null | undefined): string {
  if (!admin) return '';
  const n = (admin.name || '').trim();
  return n || admin.email;
}

const ASSIGNEE_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

@Injectable()
export class PlanningActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDates(start: string, end: string): { startDate: Date; endDate: Date } {
    const startDate = parseDateOnlyUtc(start);
    const endDate = parseDateOnlyUtc(end);
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
    return { startDate, endDate };
  }

  private async requireValidAssigneeAdmin(id: string): Promise<string> {
    const a = await this.prisma.admin.findUnique({ where: { id } });
    if (!a) throw new BadRequestException('Assignee not found');
    if (a.status !== 'ACTIVE') throw new BadRequestException('Assignee is not active');
    if (!ASSIGNEE_ROLES.includes(a.role as (typeof ASSIGNEE_ROLES)[number])) {
      throw new BadRequestException('Assignee must have ADMIN or SUPER_ADMIN role');
    }
    return id;
  }

  private mapRow(row: {
    id: number;
    description: string;
    startDate: Date;
    endDate: Date;
    status: PlanningActivityStatus;
    assigneeAdminId: string | null;
    assigneeAdmin: { name: string | null; email: string } | null;
    progressPercent: number;
    createdById?: string | null;
    updatedById?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return toStrapiLike(row.id, {
      description: row.description,
      startDate: toDateOnly(row.startDate),
      endDate: toDateOnly(row.endDate),
      status: row.status,
      assignee: assigneeLabel(row.assigneeAdmin),
      assigneeAdminId: row.assigneeAdminId,
      progressPercent: row.progressPercent,
      createdById: row.createdById ?? null,
      updatedById: row.updatedById ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  async listAssignees() {
    const rows = await this.prisma.admin.findMany({
      where: {
        status: 'ACTIVE',
        role: { in: [...ASSIGNEE_ROLES] },
      },
      select: { id: true, email: true, name: true, role: true },
      orderBy: [{ role: 'desc' }, { email: 'asc' }],
    });
    return { data: rows };
  }

  async findAll(from?: string, to?: string) {
    const where =
      from && to
        ? {
            AND: [
              { endDate: { gte: parseDateOnlyUtc(from) } },
              { startDate: { lte: parseDateOnlyUtc(to) } },
            ],
          }
        : {};
    const rows = await this.prisma.adminPlanningActivity.findMany({
      where,
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
      include: {
        assigneeAdmin: { select: { name: true, email: true } },
      },
    });
    return wrapData(rows.map((r) => this.mapRow(r)));
  }

  async findOne(id: number) {
    const row = await this.prisma.adminPlanningActivity.findUnique({
      where: { id },
      include: { assigneeAdmin: { select: { name: true, email: true } } },
    });
    if (!row) throw new NotFoundException('Planning activity not found');
    return this.mapRow(row);
  }

  async create(data: {
    description: string;
    startDate: string;
    endDate: string;
    status?: PlanningActivityStatus;
    assigneeAdminId?: string | null;
    progressPercent?: number;
  }, adminId?: string) {
    const { startDate, endDate } = this.parseDates(data.startDate, data.endDate);
    let assigneeAdminId: string | null = null;
    if (data.assigneeAdminId != null && String(data.assigneeAdminId).trim() !== '') {
      assigneeAdminId = await this.requireValidAssigneeAdmin(String(data.assigneeAdminId).trim());
    }
    const row = await this.prisma.adminPlanningActivity.create({
      data: {
        description: data.description.trim(),
        startDate,
        endDate,
        status: data.status ?? PlanningActivityStatus.PENDING,
        assigneeAdminId,
        progressPercent: data.progressPercent ?? 0,
        createdById: adminId ?? undefined,
        updatedById: adminId ?? undefined,
      },
      include: { assigneeAdmin: { select: { name: true, email: true } } },
    });
    return this.mapRow(row);
  }

  async update(
    id: number,
    data: {
      description?: string;
      startDate?: string;
      endDate?: string;
      status?: PlanningActivityStatus;
      assigneeAdminId?: string | null;
      progressPercent?: number;
    },
    adminId?: string,
  ) {
    const existing = await this.prisma.adminPlanningActivity.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Planning activity not found');

    let startDate = existing.startDate;
    let endDate = existing.endDate;
    if (data.startDate != null || data.endDate != null) {
      const s = data.startDate != null ? data.startDate : toDateOnly(existing.startDate);
      const e = data.endDate != null ? data.endDate : toDateOnly(existing.endDate);
      const parsed = this.parseDates(s, e);
      startDate = parsed.startDate;
      endDate = parsed.endDate;
    }

    let assigneeAdminId: string | null | undefined = undefined;
    if (data.assigneeAdminId !== undefined) {
      if (data.assigneeAdminId === null || data.assigneeAdminId === '') {
        assigneeAdminId = null;
      } else {
        assigneeAdminId = await this.requireValidAssigneeAdmin(data.assigneeAdminId.trim());
      }
    }

    const row = await this.prisma.adminPlanningActivity.update({
      where: { id },
      data: {
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
        startDate,
        endDate,
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(assigneeAdminId !== undefined ? { assigneeAdminId } : {}),
        ...(data.progressPercent !== undefined ? { progressPercent: data.progressPercent } : {}),
        updatedById: adminId ?? undefined,
      },
      include: { assigneeAdmin: { select: { name: true, email: true } } },
    });
    return this.mapRow(row);
  }

  async remove(id: number) {
    const existing = await this.prisma.adminPlanningActivity.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Planning activity not found');
    await this.prisma.adminPlanningActivity.delete({ where: { id } });
    return { ok: true };
  }
}
