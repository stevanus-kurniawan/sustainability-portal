import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogEntry {
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: any;
}

export interface AdminAuditLogEntry {
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeJson?: Record<string, unknown>;
  afterJson?: Record<string, unknown>;
  actorAdminId?: string;
  actorUserId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    userEmail?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }) {
    const { userEmail, entityType, entityId, action, startDate, endDate, skip, take } = params;

    return this.prisma.auditLog.findMany({
      where: {
        ...(userEmail && { userEmail }),
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
        ...(action && { action }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
    });
  }

  async create(entry: AuditLogEntry) {
    return this.prisma.auditLog.create({
      data: entry,
    });
  }

  async createAdminAudit(entry: AdminAuditLogEntry) {
    return this.prisma.auditLog.create({
      data: {
        userEmail: entry.userEmail,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeJson: (entry.beforeJson ?? undefined) as object | undefined,
        afterJson: (entry.afterJson ?? undefined) as object | undefined,
        actorAdminId: entry.actorAdminId ?? undefined,
        actorUserId: entry.actorUserId ?? undefined,
        ip: entry.ip ?? undefined,
        userAgent: entry.userAgent ?? undefined,
        metadata: (entry.metadata ?? undefined) as object | undefined,
      },
    });
  }

  async log(
    userEmail: string,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: any,
  ) {
    return this.create({
      userEmail,
      action,
      entityType,
      entityId,
      metadata,
    });
  }

  async getEntityTypes() {
    const result = await this.prisma.auditLog.groupBy({
      by: ['entityType'],
      _count: { entityType: true },
      orderBy: { entityType: 'asc' },
    });

    return result.map((r) => ({
      entityType: r.entityType,
      count: r._count.entityType,
    }));
  }

  async getActions() {
    const result = await this.prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { action: 'asc' },
    });

    return result.map((r) => ({
      action: r.action,
      count: r._count.action,
    }));
  }

  async getUserActivity(userEmail: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.auditLog.findMany({
      where: {
        userEmail,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEntityHistory(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(params?: {
    userEmail?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return this.prisma.auditLog.count({
      where: {
        ...(params?.userEmail && { userEmail: params.userEmail }),
        ...(params?.entityType && { entityType: params.entityType }),
        ...(params?.startDate || params?.endDate
          ? {
              createdAt: {
                ...(params.startDate && { gte: params.startDate }),
                ...(params.endDate && { lte: params.endDate }),
              },
            }
          : {}),
      },
    });
  }
}
