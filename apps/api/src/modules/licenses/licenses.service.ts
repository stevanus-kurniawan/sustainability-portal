import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { documentDataForResponse, type DocumentWithRelations } from '../../common/document-mapper';
import { clampPagination, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, toStrapiLike } from '../../common/response';
import { paginationMeta, wrapPaginated } from '../../common/response';
const documentInclude = {
  category: true,
  tags: { include: { tag: true } },
  currentVersion: true,
} as const;

function operationalUnitData(u: { id: number; name: string; slug: string; logoFileKey: string | null; colorClass: string | null } | null) {
  return u ? { data: toStrapiLike(u.id, { name: u.name, slug: u.slug, logoFileKey: u.logoFileKey, colorClass: u.colorClass }) } : { data: null };
}

type LicenseStatusLiteral = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'PENDING_RENEWAL' | 'IN_REVIEW' | 'NONE';
const DATE_DRIVEN_STATUSES: LicenseStatusLiteral[] = ['ACTIVE', 'EXPIRING', 'EXPIRED'];

function computeStatus(expiryDate: Date | null): LicenseStatusLiteral {
  if (!expiryDate) return 'ACTIVE';
  const now = new Date();
  const days = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'EXPIRED';
  if (days <= 30) return 'EXPIRING';
  return 'ACTIVE';
}

function normalizedStatus(expiryDate: Date | null, status?: LicenseStatusLiteral | null): LicenseStatusLiteral {
  const dateStatus = computeStatus(expiryDate);
  if (dateStatus === 'EXPIRED') return 'EXPIRED';
  if (!status || DATE_DRIVEN_STATUSES.includes(status)) return dateStatus;
  return status;
}

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

  private async syncDateDrivenStatuses() {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.license.updateMany({
        where: {
          expiryDate: { not: null, lt: now },
          status: { not: 'EXPIRED' },
        },
        data: { status: 'EXPIRED' as any },
      }),
      this.prisma.license.updateMany({
        where: {
          expiryDate: { not: null, gte: now, lte: in30 },
          status: { in: DATE_DRIVEN_STATUSES.filter((status) => status !== 'EXPIRING') as any },
        },
        data: { status: 'EXPIRING' as any },
      }),
      this.prisma.license.updateMany({
        where: {
          OR: [{ expiryDate: null }, { expiryDate: { gt: in30 } }],
          status: { in: DATE_DRIVEN_STATUSES.filter((status) => status !== 'ACTIVE') as any },
        },
        data: { status: 'ACTIVE' as any },
      }),
    ]);
  }

  async getNotificationRules() {
    return this.prisma.notificationRule.findMany({
      where: { objectType: 'LICENSE', isActive: true },
      orderBy: { daysBeforeExpiry: 'desc' },
    });
  }

  async findAllPublic(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    operationalUnitId?: number;
  }) {
    await this.syncDateDrivenStatuses();
    const { page, pageSize } = clampPagination(params.page, params.pageSize);
    const and: Array<Record<string, unknown>> = [];
    if (params.search) {
      and.push({
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { authority: { contains: params.search, mode: 'insensitive' } },
          { licenseNo: { contains: params.search, mode: 'insensitive' } },
        ],
      });
    }
    if (params.status) {
      and.push({ status: params.status });
    }
    if (params.operationalUnitId != null) and.push({ operationalUnitId: params.operationalUnitId });
    and.push({ contentVersion: 'V2' });
    const where = and.length ? { AND: and } : {};
    const [items, total] = await Promise.all([
      this.prisma.license.findMany({
        where,
        include: { document: { include: documentInclude }, operationalUnit: true },
        orderBy: { expiryDate: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.license.count({ where }),
    ]);
    const data = items.map((c) =>
      toStrapiLike(c.id, {
        name: c.name,
        authority: c.authority,
        licenseNo: c.licenseNo,
        issuedDate: c.issuedDate?.toISOString() ?? null,
        expiryDate: c.expiryDate?.toISOString() ?? null,
        status: normalizedStatus(c.expiryDate, (c as { status?: LicenseStatusLiteral }).status),
        externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
        contentVersion: (c as { contentVersion?: string }).contentVersion ?? 'V1',
        operationalUnitId: (c as { operationalUnitId?: number | null }).operationalUnitId ?? null,
        operationalUnit: operationalUnitData((c as { operationalUnit?: { id: number; name: string; slug: string; logoFileKey: string | null; colorClass: string | null } | null }).operationalUnit ?? null),
        document: {
          data: documentDataForResponse(c.document as unknown as DocumentWithRelations),
        },
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  /** Public: licenses under a sub-content (category slug + sub-content slug). For License category with sub-contents. Scoped to this category+sub only. */
  async findByCategorySlugAndSubSlugPublic(
    categorySlug: string,
    subSlug: string,
    pageParam = DEFAULT_PAGE,
    pageSizeParam = DEFAULT_PAGE_SIZE,
    search?: string,
  ) {
    await this.syncDateDrivenStatuses();
    const { page, pageSize } = clampPagination(pageParam, pageSizeParam);
    const slugLower = categorySlug.toLowerCase();
    const licenseSlugs = slugLower === 'license' || slugLower === 'licenses' ? ['license', 'licenses'] : [categorySlug];
    const category = await this.prisma.category.findFirst({
      where: { slug: { in: licenseSlugs }, isPublic: true, mode: 'WITH_SUBCONTENT' },
    });
    if (!category) return wrapPaginated([], paginationMeta(0, page, pageSize));
    const subContent = await this.prisma.subContent.findUnique({
      where: { parentCategoryId_slug: { parentCategoryId: category.id, slug: subSlug } },
    });
    if (!subContent) return wrapPaginated([], paginationMeta(0, page, pageSize));
    const where: Record<string, unknown> = { subContentId: subContent.id };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { authority: { contains: search, mode: 'insensitive' } },
        { licenseNo: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.license.findMany({
        where,
        include: { document: { include: documentInclude } },
        orderBy: { expiryDate: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.license.count({ where }),
    ]);
    const data = items.map((c) =>
      toStrapiLike(c.id, {
        name: c.name,
        authority: c.authority,
        licenseNo: c.licenseNo,
        issuedDate: c.issuedDate?.toISOString() ?? null,
        expiryDate: c.expiryDate?.toISOString() ?? null,
        status: normalizedStatus(c.expiryDate, (c as { status?: LicenseStatusLiteral }).status),
        externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
        document: {
          data: documentDataForResponse(c.document as unknown as DocumentWithRelations),
        },
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findAllAdmin(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    subContentId?: number;
    contentVersion?: string;
    operationalUnitId?: number;
    expiringWithinDays?: number;
    expiredByDate?: boolean;
  }) {
    await this.syncDateDrivenStatuses();
    const { page, pageSize } = clampPagination(params.page, params.pageSize);
    const and: Array<Record<string, unknown>> = [];
    if (params.subContentId != null) {
      and.push({ subContentId: params.subContentId });
    }
    if (params.contentVersion != null) {
      and.push({ contentVersion: params.contentVersion });
    }
    if (params.operationalUnitId != null) {
      and.push({ operationalUnitId: params.operationalUnitId });
    }
    if (params.search) {
      and.push({
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { authority: { contains: params.search, mode: 'insensitive' } },
          { licenseNo: { contains: params.search, mode: 'insensitive' } },
        ],
      });
    }
    if (params.status) {
      and.push({ status: params.status });
    }
    if (params.expiredByDate) {
      and.push({ expiryDate: { not: null, lt: new Date() } });
    }
    if (params.expiringWithinDays != null && params.expiringWithinDays > 0) {
      const now = new Date();
      const end = new Date(now.getTime() + params.expiringWithinDays * 24 * 60 * 60 * 1000);
      and.push({ expiryDate: { not: null, gte: now, lte: end } });
    }
    const where = (and.length ? { AND: and } : {}) as any;
    const orderBy =
      params.expiringWithinDays != null && params.expiringWithinDays > 0
        ? ({ expiryDate: 'asc' } as const)
        : params.expiredByDate || params.status === 'EXPIRED'
          ? ({ expiryDate: 'desc' } as const)
          : ({ updatedAt: 'desc' } as const);
    const [items, total] = await Promise.all([
      this.prisma.license.findMany({
        where,
        include: { document: { include: documentInclude }, subContent: true, operationalUnit: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.license.count({ where }),
    ]);
    const data = items.map((c) =>
      toStrapiLike(c.id, {
        name: c.name,
        authority: c.authority,
        licenseNo: c.licenseNo,
        issuedDate: c.issuedDate?.toISOString() ?? null,
        expiryDate: c.expiryDate?.toISOString() ?? null,
        status: normalizedStatus(c.expiryDate, (c as { status?: LicenseStatusLiteral }).status),
        externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
        contentVersion: (c as { contentVersion?: string }).contentVersion ?? 'V1',
        operationalUnitId: (c as { operationalUnitId?: number | null }).operationalUnitId ?? null,
        createdById: (c as { createdById?: string | null }).createdById ?? null,
        updatedById: (c as { updatedById?: string | null }).updatedById ?? null,
        createdAt: (c as { createdAt?: Date }).createdAt?.toISOString() ?? null,
        updatedAt: (c as { updatedAt?: Date }).updatedAt?.toISOString() ?? null,
        operationalUnit: operationalUnitData((c as { operationalUnit?: { id: number; name: string; slug: string; logoFileKey: string | null; colorClass: string | null } | null }).operationalUnit ?? null),
        subContent: c.subContent
          ? {
              data: toStrapiLike(c.subContent.id, {
                title: c.subContent.title,
                slug: c.subContent.slug,
                parentCategoryId: c.subContent.parentCategoryId,
              }),
            }
          : { data: null },
        document: {
          data: documentDataForResponse(c.document as unknown as DocumentWithRelations),
        },
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findOneAdmin(id: number) {
    await this.syncDateDrivenStatuses();
    const c = await this.prisma.license.findUnique({
      where: { id },
      include: { document: { include: documentInclude }, subContent: true, operationalUnit: true },
    });
    if (!c) throw new NotFoundException('License not found');
    return toStrapiLike(c.id, {
      name: c.name,
      authority: c.authority,
      licenseNo: c.licenseNo,
      issuedDate: c.issuedDate?.toISOString() ?? null,
      expiryDate: c.expiryDate?.toISOString() ?? null,
      status: normalizedStatus(c.expiryDate, (c as { status?: LicenseStatusLiteral }).status),
      externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
      contentVersion: (c as { contentVersion?: string }).contentVersion ?? 'V1',
      operationalUnitId: (c as { operationalUnitId?: number | null }).operationalUnitId ?? null,
      createdById: (c as { createdById?: string | null }).createdById ?? null,
      updatedById: (c as { updatedById?: string | null }).updatedById ?? null,
      createdAt: (c as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      updatedAt: (c as { updatedAt?: Date }).updatedAt?.toISOString() ?? null,
      operationalUnit: operationalUnitData((c as { operationalUnit?: { id: number; name: string; slug: string; logoFileKey: string | null; colorClass: string | null } | null }).operationalUnit ?? null),
      subContent: c.subContent
        ? { data: toStrapiLike(c.subContent.id, { title: c.subContent.title, slug: c.subContent.slug }) }
        : { data: null },
      document: {
        data: documentDataForResponse(c.document as unknown as DocumentWithRelations),
      },
    });
  }

  async create(data: {
    name: string;
    authority?: string;
    licenseNo?: string;
    issuedDate?: string;
    expiryDate?: string;
    status?: string;
    documentId?: number;
    subContentId?: number | null;
    contentVersion?: string;
    operationalUnitId?: number | null;
    externalLink?: string;
    createdById?: string;
  }, adminId?: string) {
    const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    const status = normalizedStatus(expiryDate, data.status as LicenseStatusLiteral | undefined);
    const c = await this.prisma.license.create({
      data: {
        name: data.name,
        authority: data.authority,
        licenseNo: data.licenseNo,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : null,
        expiryDate,
        status: status as any,
        documentId: data.documentId,
        subContentId: data.subContentId ?? undefined,
        contentVersion: (data.contentVersion ?? 'V1') as any,
        operationalUnitId: data.operationalUnitId ?? undefined,
        externalLink: data.externalLink,
        createdById: adminId ?? data.createdById,
        updatedById: adminId ?? data.createdById,
      },
      include: { document: { include: documentInclude }, subContent: true, operationalUnit: true },
    });
    const row = c as any;
    return toStrapiLike(row.id, {
      name: row.name,
      authority: row.authority,
      licenseNo: row.licenseNo,
      issuedDate: row.issuedDate?.toISOString() ?? null,
      expiryDate: row.expiryDate?.toISOString() ?? null,
      status: normalizedStatus(row.expiryDate, row.status),
      externalLink: row.externalLink ?? null,
      contentVersion: row.contentVersion ?? 'V1',
      operationalUnitId: row.operationalUnitId ?? null,
      createdById: row.createdById ?? null,
      updatedById: row.updatedById ?? null,
      createdAt: row.createdAt?.toISOString() ?? null,
      updatedAt: row.updatedAt?.toISOString() ?? null,
      operationalUnit: operationalUnitData(row.operationalUnit ?? null),
      subContent: row.subContent
        ? { data: toStrapiLike(row.subContent.id, { title: row.subContent.title, slug: row.subContent.slug }) }
        : { data: null },
      document: {
        data: documentDataForResponse(row.document as unknown as DocumentWithRelations),
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      authority?: string;
      licenseNo?: string;
      issuedDate?: string;
      expiryDate?: string;
      status?: string;
      documentId?: number | null;
      subContentId?: number | null;
      contentVersion?: string;
      operationalUnitId?: number | null;
      externalLink?: string | null;
      updatedById?: string;
    },
    adminId?: string,
  ) {
    const existing = await this.prisma.license.findUnique({ where: { id }, select: { expiryDate: true, status: true } });
    if (!existing) throw new NotFoundException('License not found');
    const expiryDate = data.expiryDate ? new Date(data.expiryDate) : existing.expiryDate;
    const status = normalizedStatus(expiryDate, (data.status ?? existing.status) as LicenseStatusLiteral);
    const c = await this.prisma.license.update({
      where: { id },
      data: {
        ...data,
        contentVersion: data.contentVersion as any,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
        expiryDate: data.expiryDate ? expiryDate : undefined,
        status: status as any,
        updatedById: adminId ?? data.updatedById,
      } as any,
      include: { document: { include: documentInclude }, subContent: true, operationalUnit: true },
    });
    const row = c as any;
    return toStrapiLike(row.id, {
      name: row.name,
      authority: row.authority,
      licenseNo: row.licenseNo,
      issuedDate: row.issuedDate?.toISOString() ?? null,
      expiryDate: row.expiryDate?.toISOString() ?? null,
      status: normalizedStatus(row.expiryDate, row.status),
      externalLink: row.externalLink ?? null,
      contentVersion: row.contentVersion ?? 'V1',
      operationalUnitId: row.operationalUnitId ?? null,
      createdById: row.createdById ?? null,
      updatedById: row.updatedById ?? null,
      createdAt: row.createdAt?.toISOString() ?? null,
      updatedAt: row.updatedAt?.toISOString() ?? null,
      operationalUnit: operationalUnitData(row.operationalUnit ?? null),
      subContent: row.subContent
        ? { data: toStrapiLike(row.subContent.id, { title: row.subContent.title, slug: row.subContent.slug }) }
        : { data: null },
      document: {
        data: documentDataForResponse(row.document as unknown as DocumentWithRelations),
      },
    });
  }

  async remove(id: number) {
    await this.prisma.license.delete({ where: { id } });
    return { deleted: true };
  }

  async logAudit(userEmail: string, action: string, licenseId: string, metadata?: unknown): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userEmail,
        action,
        entityType: 'LICENSE',
        entityId: licenseId,
        metadata: metadata as any,
      },
    });
  }
}
