import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { clampPagination, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, toStrapiLike } from '../../common/response';
import { paginationMeta, wrapPaginated } from '../../common/response';

@Injectable()
export class GrievancesService {
  constructor(private prisma: PrismaService) {}

  async findAllPublic(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    category?: string;
  }) {
    const { page, pageSize } = clampPagination(params.page, params.pageSize);
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status as 'OPEN' | 'IN_REVIEW' | 'CLOSED';
    if (params.category) where.category = params.category;
    const [items, total] = await Promise.all([
      this.prisma.grievanceCase.findMany({
        where,
        orderBy: { receivedDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.grievanceCase.count({ where }),
    ]);
    const data = items.map((g) =>
      toStrapiLike(g.id, {
        caseNo: g.caseNo,
        status: g.status,
        category: g.category,
        receivedDate: g.receivedDate.toISOString(),
        publicSummary: g.publicSummary,
        externalLink: (g as { externalLink?: string | null }).externalLink ?? null,
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findAllAdmin(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    category?: string;
  }) {
    const { page, pageSize } = clampPagination(params.page, params.pageSize);
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status as 'OPEN' | 'IN_REVIEW' | 'CLOSED';
    if (params.category) where.category = params.category;
    const [items, total] = await Promise.all([
      this.prisma.grievanceCase.findMany({
        where,
        orderBy: { receivedDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.grievanceCase.count({ where }),
    ]);
    const data = items.map((g) =>
      toStrapiLike(g.id, {
        caseNo: g.caseNo,
        status: g.status,
        category: g.category,
        receivedDate: g.receivedDate.toISOString(),
        publicSummary: g.publicSummary,
        externalLink: (g as { externalLink?: string | null }).externalLink ?? null,
        createdById: (g as { createdById?: string | null }).createdById ?? null,
        updatedById: (g as { updatedById?: string | null }).updatedById ?? null,
        createdAt: (g as { createdAt?: Date }).createdAt?.toISOString() ?? null,
        updatedAt: (g as { updatedAt?: Date }).updatedAt?.toISOString() ?? null,
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findOneAdmin(id: number) {
    const g = await this.prisma.grievanceCase.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Grievance case not found');
    return toStrapiLike(g.id, {
      caseNo: g.caseNo,
      status: g.status,
      category: g.category,
      receivedDate: g.receivedDate.toISOString(),
      publicSummary: g.publicSummary,
      externalLink: (g as { externalLink?: string | null }).externalLink ?? null,
      createdById: (g as { createdById?: string | null }).createdById ?? null,
      updatedById: (g as { updatedById?: string | null }).updatedById ?? null,
      createdAt: (g as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      updatedAt: (g as { updatedAt?: Date }).updatedAt?.toISOString() ?? null,
    });
  }

  async create(data: {
    caseNo: string;
    status?: string;
    category?: string;
    receivedDate: string;
    publicSummary?: string;
    evidenceDocumentId?: number;
    externalLink?: string;
    createdById?: string;
  }, adminId?: string) {
    const g = await this.prisma.grievanceCase.create({
      data: {
        caseNo: data.caseNo,
        status: (data.status as 'OPEN' | 'IN_REVIEW' | 'CLOSED') ?? 'OPEN',
        category: data.category,
        receivedDate: new Date(data.receivedDate),
        publicSummary: data.publicSummary,
        evidenceDocumentId: data.evidenceDocumentId,
        externalLink: data.externalLink,
        createdById: adminId ?? data.createdById,
        updatedById: adminId ?? data.createdById,
      },
    });
    return toStrapiLike(g.id, {
      caseNo: g.caseNo,
      status: g.status,
      category: g.category,
      receivedDate: g.receivedDate.toISOString(),
      publicSummary: g.publicSummary,
      externalLink: (g as { externalLink?: string | null }).externalLink ?? null,
      createdById: (g as { createdById?: string | null }).createdById ?? null,
      updatedById: (g as { updatedById?: string | null }).updatedById ?? null,
      createdAt: (g as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      updatedAt: (g as { updatedAt?: Date }).updatedAt?.toISOString() ?? null,
    });
  }

  async update(
    id: number,
    data: {
      status?: string;
      category?: string;
      publicSummary?: string;
      evidenceDocumentId?: number | null;
      externalLink?: string | null;
      updatedById?: string;
    },
    adminId?: string,
  ) {
    const g = await this.prisma.grievanceCase.update({
      where: { id },
      data: {
        ...data,
        status: data.status as 'OPEN' | 'IN_REVIEW' | 'CLOSED' | undefined,
        updatedById: adminId ?? data.updatedById,
      },
    });
    return toStrapiLike(g.id, {
      caseNo: g.caseNo,
      status: g.status,
      category: g.category,
      receivedDate: g.receivedDate.toISOString(),
      publicSummary: g.publicSummary,
      externalLink: (g as { externalLink?: string | null }).externalLink ?? null,
      createdById: (g as { createdById?: string | null }).createdById ?? null,
      updatedById: (g as { updatedById?: string | null }).updatedById ?? null,
      createdAt: (g as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      updatedAt: (g as { updatedAt?: Date }).updatedAt?.toISOString() ?? null,
    });
  }

  async remove(id: number) {
    await this.prisma.grievanceCase.delete({ where: { id } });
    return { deleted: true };
  }
}
