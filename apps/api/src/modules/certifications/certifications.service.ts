import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CertificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { mapDocumentToStrapi, type DocumentWithRelations } from '../../common/document-mapper';
import { toStrapiLike } from '../../common/response';
import { paginationMeta, wrapPaginated } from '../../common/response';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const documentInclude = {
  category: true,
  tags: { include: { tag: true } },
  currentVersion: true,
} as const;

function computeStatus(expiryDate: Date | null): CertificationStatus {
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
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const and: Prisma.CertificationWhereInput[] = [];
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
        include: { document: { include: documentInclude } },
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
        document: {
          data: c.document ? mapDocumentToStrapi(c.document as unknown as DocumentWithRelations) : null,
        },
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findAllAdmin(params: { page?: number; pageSize?: number }) {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const [items, total] = await Promise.all([
      this.prisma.certification.findMany({
        include: { document: { include: documentInclude } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.certification.count(),
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
        document: {
          data: c.document ? mapDocumentToStrapi(c.document as unknown as DocumentWithRelations) : null,
        },
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findOneAdmin(id: number) {
    const c = await this.prisma.certification.findUnique({
      where: { id },
      include: { document: { include: documentInclude } },
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
      document: {
        data: c.document ? mapDocumentToStrapi(c.document as unknown as DocumentWithRelations) : null,
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
    createdById?: string;
  }) {
    const cert = await this.prisma.certification.create({
      data: {
        name: data.name,
        issuer: data.issuer,
        certificateNo: data.certificateNo,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        documentId: data.documentId,
        externalLink: data.externalLink,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
      include: { document: { include: documentInclude } },
    });
    return toStrapiLike(cert.id, {
      name: cert.name,
      issuer: cert.issuer,
      certificateNo: cert.certificateNo,
      issuedDate: cert.issuedDate?.toISOString() ?? null,
      expiryDate: cert.expiryDate?.toISOString() ?? null,
      status: computeStatus(cert.expiryDate),
      externalLink: (cert as { externalLink?: string | null }).externalLink ?? null,
      document: {
        data: cert.document ? mapDocumentToStrapi(cert.document as unknown as DocumentWithRelations) : null,
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
      updatedById?: string;
    },
  ) {
    const cert = await this.prisma.certification.update({
      where: { id },
      data: {
        ...data,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      include: { document: { include: documentInclude } },
    });
    return toStrapiLike(cert.id, {
      name: cert.name,
      issuer: cert.issuer,
      certificateNo: cert.certificateNo,
      issuedDate: cert.issuedDate?.toISOString() ?? null,
      expiryDate: cert.expiryDate?.toISOString() ?? null,
      status: computeStatus(cert.expiryDate),
      externalLink: (cert as { externalLink?: string | null }).externalLink ?? null,
      document: {
        data: cert.document ? mapDocumentToStrapi(cert.document as unknown as DocumentWithRelations) : null,
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
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
