import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { documentDataForResponse, type DocumentWithRelations } from '../../common/document-mapper';
import { clampPagination, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, toStrapiLike } from '../../common/response';
import { paginationMeta, wrapPaginated } from '../../common/response';
const documentInclude = {
  category: true,
  tags: { include: { tag: true } },
  currentVersion: true,
} as const;

function categoryData(c: { id: number; name: string; slug: string } | null) {
  return c ? { data: toStrapiLike(c.id, { name: c.name, slug: c.slug }) } : { data: null };
}
function subContentData(s: { id: number; title: string; slug: string } | null) {
  return s ? { data: toStrapiLike(s.id, { title: s.title, slug: s.slug }) } : { data: null };
}

type CertificationStatusLiteral = 'ACTIVE' | 'EXPIRING' | 'EXPIRED';

function computeStatus(expiryDate: Date | null): CertificationStatusLiteral {
  if (!expiryDate) return 'ACTIVE';
  const now = new Date();
  const days = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'EXPIRED';
  if (days <= 30) return 'EXPIRING';
  return 'ACTIVE';
}

@Injectable()
export class CertificationsService {
  private readonly logger = new Logger(CertificationsService.name);

  constructor(private prisma: PrismaService) {}

  async getNotificationRules() {
    return this.prisma.notificationRule.findMany({
      where: { objectType: 'CERTIFICATION', isActive: true },
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
          { issuer: { contains: params.search, mode: 'insensitive' } },
          { certificateNo: { contains: params.search, mode: 'insensitive' } },
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
      this.prisma.certification.findMany({
        where,
        include: {
          document: { include: documentInclude },
          category: true,
          subContent: true,
        },
        orderBy: { expiryDate: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.certification.count({ where }),
    ]);
    const data = items.map((c) =>
      toStrapiLike(c.id, {
        name: c.name,
        issuer: c.issuer,
        certificateNo: c.certificateNo,
        issuedDate: c.issuedDate?.toISOString() ?? null,
        expiryDate: c.expiryDate?.toISOString() ?? null,
        status: computeStatus(c.expiryDate),
        externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
        categoryId: c.categoryId ?? null,
        subContentId: c.subContentId ?? null,
        category: categoryData(c.category),
        subContent: subContentData(c.subContent),
        document: {
          data: documentDataForResponse(c.document as unknown as DocumentWithRelations),
        },
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  /** Public: certifications for a sub-content (by category slug + sub slug). Used for portal Certificate section. */
  async findByCategorySlugAndSubSlugPublic(
    categorySlug: string,
    subSlug: string,
    pageParam = DEFAULT_PAGE,
    pageSizeParam = DEFAULT_PAGE_SIZE,
  ) {
    const { page, pageSize } = clampPagination(pageParam, pageSizeParam);
    const category = await this.prisma.category.findFirst({
      where: { slug: categorySlug, isPublic: true },
    });
    if (!category) return wrapPaginated([], paginationMeta(0, page, pageSize));
    const subContent = await this.prisma.subContent.findUnique({
      where: { parentCategoryId_slug: { parentCategoryId: category.id, slug: subSlug } },
    });
    if (!subContent) return wrapPaginated([], paginationMeta(0, page, pageSize));
    const where = { subContentId: subContent.id } as any;
    const [items, total] = await Promise.all([
      this.prisma.certification.findMany({
        where,
        include: {
          document: { include: documentInclude },
          category: true,
          subContent: true,
        },
        orderBy: { expiryDate: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.certification.count({ where }),
    ]);
    const data = items.map((c) =>
      toStrapiLike(c.id, {
        name: c.name,
        issuer: c.issuer,
        certificateNo: c.certificateNo,
        issuedDate: c.issuedDate?.toISOString() ?? null,
        expiryDate: c.expiryDate?.toISOString() ?? null,
        status: computeStatus(c.expiryDate),
        externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
        categoryId: c.categoryId ?? null,
        subContentId: c.subContentId ?? null,
        category: categoryData(c.category),
        subContent: subContentData(c.subContent),
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
    categoryId?: number | null;
    subContentId?: number | null;
  }) {
    const { page, pageSize } = clampPagination(params.page, params.pageSize);

    const and: Array<Record<string, unknown>> = [];
    if (params.search) {
      and.push({
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { issuer: { contains: params.search, mode: 'insensitive' } },
          { certificateNo: { contains: params.search, mode: 'insensitive' } },
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
    if (params.subContentId != null) {
      and.push({ subContentId: params.subContentId });
    } else if (params.categoryId != null) {
      and.push({ categoryId: params.categoryId });
    }
    const where = and.length ? { AND: and } : {};

    const [items, total] = await Promise.all([
      this.prisma.certification.findMany({
        where,
        include: {
          document: { include: documentInclude },
          category: true,
          subContent: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.certification.count({ where }),
    ]);
    const data = items.map((c) =>
      toStrapiLike(c.id, {
        name: c.name,
        issuer: c.issuer,
        certificateNo: c.certificateNo,
        issuedDate: c.issuedDate?.toISOString() ?? null,
        expiryDate: c.expiryDate?.toISOString() ?? null,
        status: computeStatus(c.expiryDate),
        externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
        categoryId: c.categoryId ?? null,
        subContentId: c.subContentId ?? null,
        category: categoryData(c.category),
        subContent: subContentData(c.subContent),
        document: {
          data: documentDataForResponse(c.document as unknown as DocumentWithRelations),
        },
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findOneAdmin(id: number) {
    const c = await this.prisma.certification.findUnique({
      where: { id },
      include: {
        document: { include: documentInclude },
        category: true,
        subContent: true,
      },
    });
    if (!c) throw new NotFoundException('Certification not found');
    return toStrapiLike(c.id, {
      name: c.name,
      issuer: c.issuer,
      certificateNo: c.certificateNo,
      issuedDate: c.issuedDate?.toISOString() ?? null,
      expiryDate: c.expiryDate?.toISOString() ?? null,
      status: computeStatus(c.expiryDate),
      externalLink: (c as { externalLink?: string | null }).externalLink ?? null,
      categoryId: c.categoryId ?? null,
      subContentId: c.subContentId ?? null,
      category: categoryData(c.category),
      subContent: subContentData(c.subContent),
      document: {
        data: documentDataForResponse(c.document as unknown as DocumentWithRelations),
      },
    });
  }

  async create(data: {
    name: string;
    issuer?: string;
    certificateNo?: string;
    issuedDate?: string;
    expiryDate?: string;
    documentId?: number;
    externalLink?: string;
    categoryId?: number | null;
    subContentId?: number | null;
    createdById?: string;
  }) {
    if (data.subContentId != null && data.categoryId == null) {
      throw new BadRequestException('subContentId requires categoryId');
    }
    if (data.subContentId != null && data.categoryId != null) {
      const sub = await this.prisma.subContent.findUnique({
        where: { id: data.subContentId },
        select: { parentCategoryId: true },
      });
      if (!sub || sub.parentCategoryId !== data.categoryId) {
        throw new BadRequestException('subContent does not belong to the selected category');
      }
    }
    const cert = await this.prisma.certification.create({
      data: {
        name: data.name,
        issuer: data.issuer,
        certificateNo: data.certificateNo,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        documentId: data.documentId,
        externalLink: data.externalLink,
        categoryId: data.categoryId ?? undefined,
        subContentId: data.subContentId ?? undefined,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
      include: {
        document: { include: documentInclude },
        category: true,
        subContent: true,
      },
    });
    return toStrapiLike(cert.id, {
      name: cert.name,
      issuer: cert.issuer,
      certificateNo: cert.certificateNo,
      issuedDate: cert.issuedDate?.toISOString() ?? null,
      expiryDate: cert.expiryDate?.toISOString() ?? null,
      status: computeStatus(cert.expiryDate),
      externalLink: (cert as { externalLink?: string | null }).externalLink ?? null,
      categoryId: cert.categoryId ?? null,
      subContentId: cert.subContentId ?? null,
      category: categoryData(cert.category),
      subContent: subContentData(cert.subContent),
      document: {
        data: documentDataForResponse(cert.document as unknown as DocumentWithRelations),
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      issuer?: string;
      certificateNo?: string;
      issuedDate?: string;
      expiryDate?: string;
      documentId?: number | null;
      externalLink?: string | null;
      categoryId?: number | null;
      subContentId?: number | null;
      updatedById?: string;
    },
  ) {
    const categoryIdForSub = data.categoryId ?? (data.subContentId != null
      ? (await this.prisma.certification.findUnique({ where: { id }, select: { categoryId: true } }))?.categoryId
      : undefined);
    if (data.subContentId != null && categoryIdForSub == null) {
      throw new BadRequestException('subContentId requires categoryId');
    }
    if (data.subContentId != null && categoryIdForSub != null) {
      const sub = await this.prisma.subContent.findUnique({
        where: { id: data.subContentId },
        select: { parentCategoryId: true },
      });
      if (!sub || sub.parentCategoryId !== categoryIdForSub) {
        throw new BadRequestException('subContent does not belong to the selected category');
      }
    }
    const cert = await this.prisma.certification.update({
      where: { id },
      data: {
        ...data,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        categoryId: data.categoryId ?? undefined,
        subContentId: data.subContentId ?? undefined,
      },
      include: {
        document: { include: documentInclude },
        category: true,
        subContent: true,
      },
    });
    return toStrapiLike(cert.id, {
      name: cert.name,
      issuer: cert.issuer,
      certificateNo: cert.certificateNo,
      issuedDate: cert.issuedDate?.toISOString() ?? null,
      expiryDate: cert.expiryDate?.toISOString() ?? null,
      status: computeStatus(cert.expiryDate),
      externalLink: (cert as { externalLink?: string | null }).externalLink ?? null,
      categoryId: cert.categoryId ?? null,
      subContentId: cert.subContentId ?? null,
      category: categoryData(cert.category),
      subContent: subContentData(cert.subContent),
      document: {
        data: documentDataForResponse(cert.document as unknown as DocumentWithRelations),
      },
    });
  }

  async remove(id: number) {
    await this.prisma.certification.delete({ where: { id } });
    return { deleted: true };
  }

  async checkExpiringCertifications(): Promise<void> {
    const rules = await this.getNotificationRules();
    for (const rule of rules) {
      this.logger.log(
        `Checking certifications expiring in ${rule.daysBeforeExpiry} days (${rule.channel})`,
      );
    }
  }

  async logAudit(userEmail: string, action: string, certificationId: string, metadata?: unknown): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userEmail,
        action,
        entityType: 'CERTIFICATION',
        entityId: certificationId,
        metadata: metadata as any,
      },
    });
  }
}
