import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    subContent: true,
    tags: { include: { tag: true } },
    currentVersion: true,
  } as const;

  private notDeleted = { isDeleted: false } as const;

  async findPoliciesPublic(page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
    const where = { type: 'POLICY' as const, isPublic: true, isPublished: true, ...this.notDeleted };
    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: this.includeForPublic,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);
    const data = items.map((d) => mapDocumentToStrapi(d as DocumentWithRelations));
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findGrievanceDocumentsPublic(page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
    const where = { type: 'GRIEVANCE' as const, isPublic: true, isPublished: true, ...this.notDeleted };
    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: this.includeForPublic,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
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
    const where: Record<string, unknown> = {
      isPublic: true,
      isPublished: true,
      ...this.notDeleted,
    };
    if (params.category) {
      where.category = { slug: params.category };
      where.subContentId = null; // DIRECT mode: only documents not under a sub-content
    }
    if (params.type) {
      where.type = params.type;
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

  /** Public: documents under a sub-content (category slug + sub-content slug). For WITH_SUBCONTENT categories only. */
  async findDocumentsByCategorySlugAndSubSlugPublic(
    categorySlug: string,
    subSlug: string,
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
  ) {
    const category = await this.prisma.category.findFirst({
      where: { slug: categorySlug, isPublic: true, mode: 'WITH_SUBCONTENT' },
    });
    if (!category) return wrapPaginated([], paginationMeta(0, page, pageSize));
    const subContent = await this.prisma.subContent.findUnique({
      where: { parentCategoryId_slug: { parentCategoryId: category.id, slug: subSlug } },
    });
    if (!subContent) return wrapPaginated([], paginationMeta(0, page, pageSize));
    const where: Record<string, unknown> = {
      isPublic: true,
      isPublished: true,
      ...this.notDeleted,
      subContentId: subContent.id,
    };
    const orderBy = { publishedAt: 'desc' as const };
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
      where: { id, isPublic: true, isPublished: true, ...this.notDeleted },
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
    subContentId?: number;
  }) {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Record<string, unknown> = { ...this.notDeleted };
    if (params.type) where.type = params.type;
    if (params.isPublished !== undefined) where.isPublished = params.isPublished;
    if (params.categoryId !== undefined) where.categoryId = params.categoryId;
    if (params.subContentId !== undefined) where.subContentId = params.subContentId;
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
    const doc = await this.prisma.document.findFirst({
      where: { id, ...this.notDeleted },
      include: this.includeForPublic,
    });
    if (!doc) return null;
    return mapDocumentToStrapi(doc as DocumentWithRelations);
  }

  async findAllDeleted(params: {
    page?: number;
    pageSize?: number;
    type?: string;
    search?: string;
  }) {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Record<string, unknown> = { isDeleted: true };
    if (params.type) where.type = params.type;
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
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);
    const data = items.map((d) => mapDocumentToStrapi(d as DocumentWithRelations));
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async create(
    data: {
      title: string;
      type: string;
      description?: string;
      externalLink?: string;
      isPublic?: boolean;
      isPublished?: boolean;
      categoryId?: number;
      subContentId?: number | null;
      tagIds?: number[];
      attachment?: { fileKey: string; fileName: string; mimeType?: string; fileSize?: number };
    },
    createdById?: string,
  ) {
    if (data.categoryId != null) {
      const category = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
      if (category?.mode === 'WITH_SUBCONTENT' && (data.subContentId == null || data.subContentId === 0)) {
        throw new BadRequestException('This section uses sub-content; a sub-content must be selected.');
      }
      if (category?.mode === 'DIRECT' && data.subContentId != null && data.subContentId !== 0) {
        throw new BadRequestException('This section does not use sub-content; sub_content_id must be empty.');
      }
    }
    const { tagIds, attachment, ...rest } = data;
    // When published, always set isPublic so the document appears on the public site (policies, library, etc.)
    const isPublished = rest.isPublished === true;
    const isPublic = isPublished ? true : (rest.isPublic ?? false);
    const doc = await this.prisma.document.create({
      data: {
        ...rest,
        isPublic,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        createdById: createdById ?? undefined,
        updatedById: createdById ?? undefined,
      } as any,
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
          createdById: createdById ?? undefined,
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
    return full
      ? mapDocumentToStrapi(full as unknown as DocumentWithRelations)
      : mapDocumentToStrapi(doc as unknown as DocumentWithRelations);
  }

  async update(
    id: number,
    data: {
      title?: string;
      type?: string;
      description?: string;
      externalLink?: string | null;
      isPublic?: boolean;
      isPublished?: boolean;
      categoryId?: number | null;
      subContentId?: number | null;
      tagIds?: number[];
      attachment?: { fileKey: string; fileName: string; mimeType?: string; fileSize?: number } | null;
    },
    updatedById?: string,
  ) {
    const existing = await this.prisma.document.findFirst({
      where: { id, ...this.notDeleted },
    });
    if (!existing) throw new NotFoundException('Document not found or has been deleted');
    const categoryId = data.categoryId !== undefined ? data.categoryId : existing.categoryId;
    if (categoryId != null) {
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      const subContentId = data.subContentId !== undefined ? data.subContentId : existing.subContentId;
      if (category?.mode === 'WITH_SUBCONTENT' && (subContentId == null || subContentId === 0)) {
        throw new BadRequestException('This section uses sub-content; a sub-content must be selected.');
      }
      if (category?.mode === 'DIRECT' && subContentId != null && subContentId !== 0) {
        throw new BadRequestException('This section does not use sub-content; sub_content_id must be empty.');
      }
    }
    const { tagIds, attachment, ...rest } = data;
    // When published, always set isPublic so the document appears on the public site (policies, library, etc.)
    const isPublished = rest.isPublished === true;
    const isPublic = rest.isPublic !== undefined
      ? (isPublished ? true : rest.isPublic)
      : (isPublished ? true : undefined);
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
            createdById: updatedById ?? undefined,
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
        ...(isPublic !== undefined && { isPublic }),
        ...(rest.isPublished !== undefined && { isPublished }),
        publishedAt: isPublished ? new Date() : (rest.isPublished === false ? null : undefined),
        ...(currentVersionId !== undefined && { currentVersionId }),
        updatedById: updatedById ?? undefined,
      } as any,
      include: this.includeForPublic,
    });
    return mapDocumentToStrapi(doc as unknown as DocumentWithRelations);
  }

  async remove(id: number, deletedById?: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, ...this.notDeleted },
    });
    if (!doc) return { deleted: false, message: 'Document not found or already deleted' };
    await this.prisma.document.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedById: deletedById ?? undefined,
        deletedAt: new Date(),
      },
    });
    return { deleted: true };
  }

  async restore(id: number) {
    const doc = await this.prisma.document.findFirst({
      where: { id, isDeleted: true },
    });
    if (!doc) return null;
    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedById: null,
        deletedAt: null,
      },
      include: this.includeForPublic,
    });
    return mapDocumentToStrapi(updated as DocumentWithRelations);
  }
}
