import { Injectable } from '@nestjs/common';
import { DocumentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { mapDocumentToStrapi, type DocumentWithRelations } from '../../common/document-mapper';
import { paginationMeta, wrapPaginated } from '../../common/response';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  private includeForPublic = {
    category: true,
    tags: { include: { tag: true } },
    currentVersion: true,
  } as const;

  async findPoliciesPublic(page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where: { type: 'POLICY', isPublic: true, isPublished: true },
        include: this.includeForPublic,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({
        where: { type: 'POLICY', isPublic: true, isPublished: true },
      }),
    ]);
    const data = items.map((d) => mapDocumentToStrapi(d as DocumentWithRelations));
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findLibraryPublic(params: {
    page?: number;
    pageSize?: number;
    category?: string;
    tags?: string;
    type?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.DocumentWhereInput = {
      isPublic: true,
      isPublished: true,
    };
    if (params.category) {
      where.category = { slug: params.category };
    }
    if (params.type) {
      where.type = params.type as DocumentType;
    }
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.tags) {
      const slugs = params.tags.split(',').map((s) => s.trim());
      where.tags = { some: { tag: { slug: { in: slugs } } } };
    }
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    const sortBy = params.sortBy || 'publishedAt';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
    orderBy[sortBy === 'title' ? 'title' : sortBy === 'createdAt' ? 'createdAt' : 'publishedAt'] = sortOrder;

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: this.includeForPublic,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);
    const data = items.map((d) => mapDocumentToStrapi(d as DocumentWithRelations));
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findOnePublic(id: number) {
    const doc = await this.prisma.document.findFirst({
      where: { id, isPublic: true, isPublished: true },
      include: this.includeForPublic,
    });
    if (!doc) return null;
    return mapDocumentToStrapi(doc as DocumentWithRelations);
  }

  async findAllAdmin(params: {
    page?: number;
    pageSize?: number;
    type?: string;
    search?: string;
    isPublished?: boolean;
    categoryId?: number;
  }) {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.DocumentWhereInput = {};
    if (params.type) where.type = params.type as DocumentType;
    if (params.isPublished !== undefined) where.isPublished = params.isPublished;
    if (params.categoryId !== undefined) where.categoryId = params.categoryId;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: this.includeForPublic,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);
    const data = items.map((d) => mapDocumentToStrapi(d as DocumentWithRelations));
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findOneAdmin(id: number) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: this.includeForPublic,
    });
    if (!doc) return null;
    return mapDocumentToStrapi(doc as DocumentWithRelations);
  }

  async create(data: {
    title: string;
    type: DocumentType;
    description?: string;
    externalLink?: string;
    isPublic?: boolean;
    isPublished?: boolean;
    categoryId?: number;
    tagIds?: number[];
    createdById?: string;
    attachment?: { fileKey: string; fileName: string; mimeType?: string; fileSize?: number };
  }) {
    const { tagIds, attachment, ...rest } = data;
    const doc = await this.prisma.document.create({
      data: {
        ...rest,
        publishedAt: rest.isPublished ? new Date() : null,
      },
      include: this.includeForPublic,
    });
    if (tagIds?.length) {
      await this.prisma.documentTag.createMany({
        data: tagIds.map((tagId) => ({ documentId: doc.id, tagId })),
      });
    }
    if (attachment?.fileKey) {
      const version = await this.prisma.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNo: 1,
          fileKey: attachment.fileKey,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType ?? null,
          fileSize: attachment.fileSize ?? null,
        },
      });
      await this.prisma.document.update({
        where: { id: doc.id },
        data: { currentVersionId: version.id },
      });
    }
    const full = await this.prisma.document.findUnique({
      where: { id: doc.id },
      include: this.includeForPublic,
    });
    return full ? mapDocumentToStrapi(full as DocumentWithRelations) : mapDocumentToStrapi(doc as DocumentWithRelations);
  }

  async update(
    id: number,
    data: {
      title?: string;
      type?: DocumentType;
      description?: string;
      externalLink?: string | null;
      isPublic?: boolean;
      isPublished?: boolean;
      categoryId?: number | null;
      tagIds?: number[];
      updatedById?: string;
      attachment?: { fileKey: string; fileName: string; mimeType?: string; fileSize?: number } | null;
    },
  ) {
    const { tagIds, attachment, ...rest } = data;
    if (tagIds !== undefined) {
      await this.prisma.documentTag.deleteMany({ where: { documentId: id } });
      if (tagIds.length > 0) {
        await this.prisma.documentTag.createMany({
          data: tagIds.map((tagId) => ({ documentId: id, tagId })),
        });
      }
    }
    let currentVersionId: number | null | undefined;
    if (attachment !== undefined) {
      if (attachment) {
        const doc = await this.prisma.document.findUnique({ where: { id }, include: { versions: true } });
        const nextVersionNo = doc?.versions?.length ? Math.max(...doc.versions.map((v) => v.versionNo)) + 1 : 1;
        const version = await this.prisma.documentVersion.create({
          data: {
            documentId: id,
            versionNo: nextVersionNo,
            fileKey: attachment.fileKey,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType ?? null,
            fileSize: attachment.fileSize ?? null,
          },
        });
        currentVersionId = version.id;
      } else {
        currentVersionId = null;
      }
    }
    const doc = await this.prisma.document.update({
      where: { id },
      data: {
        ...rest,
        publishedAt: rest.isPublished ? new Date() : undefined,
        ...(currentVersionId !== undefined && { currentVersionId }),
      },
      include: this.includeForPublic,
    });
    return mapDocumentToStrapi(doc as DocumentWithRelations);
  }

  async remove(id: number) {
    await this.prisma.document.delete({ where: { id } });
    return { deleted: true };
  }
}
