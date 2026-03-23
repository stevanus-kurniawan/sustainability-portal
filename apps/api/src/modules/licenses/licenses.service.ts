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

type LicenseStatusLiteral = 'ACTIVE' | 'EXPIRING' | 'EXPIRED';

function computeStatus(expiryDate: Date | null): LicenseStatusLiteral {
  if (!expiryDate) return 'ACTIVE';
  const now = new Date();
  const days = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'EXPIRED';
  if (days <= 30) return 'EXPIRING';
  return 'ACTIVE';
}

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

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
  }) {
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
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (params.status === 'EXPIRED') and.push({ expiryDate: { lt: now } });
      else if (params.status === 'EXPIRING') and.push({ expiryDate: { gte: now, lte: in30 } });
      else if (params.status === 'ACTIVE') and.push({ OR: [{ expiryDate: null }, { expiryDate: { gt: in30 } }] });
    }
    const where = and.length ? { AND: and } : {};
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
        status: computeStatus(c.expiryDate),
        externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
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
        status: computeStatus(c.expiryDate),
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
    expiringWithinDays?: number;
  }) {
    const { page, pageSize } = clampPagination(params.page, params.pageSize);
    const and: Array<Record<string, unknown>> = [];
    if (params.subContentId != null) {
      and.push({ subContentId: params.subContentId });
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
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (params.status === 'EXPIRED') and.push({ expiryDate: { lt: now } });
      else if (params.status === 'EXPIRING') and.push({ expiryDate: { gte: now, lte: in30 } });
      else if (params.status === 'ACTIVE')
        and.push({ OR: [{ expiryDate: null }, { expiryDate: { gt: in30 } }] });
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
        : params.status === 'EXPIRED'
          ? ({ expiryDate: 'desc' } as const)
          : ({ updatedAt: 'desc' } as const);
    const [items, total] = await Promise.all([
      this.prisma.license.findMany({
        where,
        include: { document: { include: documentInclude }, subContent: true },
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
        status: computeStatus(c.expiryDate),
        externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
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
    const c = await this.prisma.license.findUnique({
      where: { id },
      include: { document: { include: documentInclude }, subContent: true },
    });
    if (!c) throw new NotFoundException('License not found');
    return toStrapiLike(c.id, {
      name: c.name,
      authority: c.authority,
      licenseNo: c.licenseNo,
      issuedDate: c.issuedDate?.toISOString() ?? null,
      expiryDate: c.expiryDate?.toISOString() ?? null,
      status: computeStatus(c.expiryDate),
      externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
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
    documentId?: number;
    subContentId?: number | null;
    externalLink?: string;
    createdById?: string;
  }) {
    const c = await this.prisma.license.create({
      data: {
        name: data.name,
        authority: data.authority,
        licenseNo: data.licenseNo,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        documentId: data.documentId,
        subContentId: data.subContentId ?? undefined,
        externalLink: data.externalLink,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
      include: { document: { include: documentInclude }, subContent: true },
    });
    return toStrapiLike(c.id, {
      name: c.name,
      authority: c.authority,
      licenseNo: c.licenseNo,
      issuedDate: c.issuedDate?.toISOString() ?? null,
      expiryDate: c.expiryDate?.toISOString() ?? null,
      status: computeStatus(c.expiryDate),
      externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
      subContent: c.subContent
        ? { data: toStrapiLike(c.subContent.id, { title: c.subContent.title, slug: c.subContent.slug }) }
        : { data: null },
      document: {
        data: documentDataForResponse(c.document as unknown as DocumentWithRelations),
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
      documentId?: number | null;
      subContentId?: number | null;
      externalLink?: string | null;
      updatedById?: string;
    },
  ) {
    const c = await this.prisma.license.update({
      where: { id },
      data: {
        ...data,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      include: { document: { include: documentInclude }, subContent: true },
    });
    return toStrapiLike(c.id, {
      name: c.name,
      authority: c.authority,
      licenseNo: c.licenseNo,
      issuedDate: c.issuedDate?.toISOString() ?? null,
      expiryDate: c.expiryDate?.toISOString() ?? null,
      status: computeStatus(c.expiryDate),
      externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
      subContent: c.subContent
        ? { data: toStrapiLike(c.subContent.id, { title: c.subContent.title, slug: c.subContent.slug }) }
        : { data: null },
      document: {
        data: documentDataForResponse(c.document as unknown as DocumentWithRelations),
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
