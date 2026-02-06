import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toStrapiLike } from '../../common/response';

@Injectable()
export class SubContentsService {
  constructor(private prisma: PrismaService) {}

  async findAllByCategoryId(categoryId: number) {
    const list = await this.prisma.subContent.findMany({
      where: { parentCategoryId: categoryId },
      orderBy: { order: 'asc' },
    });
    return list.map((s: {
      id: number;
      title: string;
      slug: string;
      order: number;
      description: string | null;
      parentCategoryId: number;
      createdAt: Date;
      updatedAt: Date;
    }) =>
      toStrapiLike(s.id, {
        title: s.title,
        slug: s.slug,
        order: s.order,
        description: s.description,
        parentCategoryId: s.parentCategoryId,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }),
    );
  }

  /** Public: list sub-contents for a public category (by slug). Returns [] if category not found or not public. */
  async findAllByCategorySlugPublic(categorySlug: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug: categorySlug, isPublic: true, mode: 'WITH_SUBCONTENT' },
    });
    if (!category) return [];
    const list = await this.prisma.subContent.findMany({
      where: { parentCategoryId: category.id },
      orderBy: { order: 'asc' },
    });
    return list.map((s: {
      id: number;
      title: string;
      slug: string;
      order: number;
      description: string | null;
    }) =>
      toStrapiLike(s.id, {
        title: s.title,
        slug: s.slug,
        order: s.order,
        description: s.description,
      }),
    );
  }

  async findOne(id: number) {
    const s = await this.prisma.subContent.findUnique({
      where: { id },
      include: { parentCategory: true },
    });
    if (!s) throw new NotFoundException('Sub-content not found');
    return s;
  }

  async findOneByCategoryAndSlug(categoryId: number, slug: string) {
    return this.prisma.subContent.findUnique({
      where: { parentCategoryId_slug: { parentCategoryId: categoryId, slug } },
    });
  }

  /** Public: get one sub-content by category slug and sub slug. Returns null if not found. */
  async findOneByCategorySlugAndSubSlugPublic(categorySlug: string, subSlug: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug: categorySlug, isPublic: true, mode: 'WITH_SUBCONTENT' },
    });
    if (!category) return null;
    const sub = await this.prisma.subContent.findUnique({
      where: { parentCategoryId_slug: { parentCategoryId: category.id, slug: subSlug } },
    });
    if (!sub) return null;
    return toStrapiLike(sub.id, {
      title: sub.title,
      slug: sub.slug,
      order: sub.order,
      description: sub.description,
      parentCategoryId: sub.parentCategoryId,
    });
  }

  async create(categoryId: number, data: { title: string; slug: string; order?: number; description?: string | null }) {
    const slug = data.slug.trim().toLowerCase().replace(/\s+/g, '-');
    const order = data.order ?? 0;
    try {
      const sub = await this.prisma.subContent.create({
        data: {
          parentCategoryId: categoryId,
          title: data.title.trim(),
          slug,
          order,
          description: data.description?.trim() || null,
        },
      });
      return toStrapiLike(sub.id, {
        title: sub.title,
        slug: sub.slug,
        order: sub.order,
        description: sub.description,
        parentCategoryId: sub.parentCategoryId,
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
        throw new ConflictException('A sub-content with this slug already exists in this category');
      }
      throw e;
    }
  }

  async update(id: number, data: { title?: string; slug?: string; order?: number; description?: string | null }) {
    const existing = await this.prisma.subContent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Sub-content not found');
    const payload: { title?: string; slug?: string; order?: number; description?: string | null } = {};
    if (data.title !== undefined) payload.title = data.title.trim();
    if (data.slug !== undefined) payload.slug = data.slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (data.order !== undefined) payload.order = data.order;
    if (data.description !== undefined) payload.description = data.description?.trim() || null;
    const sub = await this.prisma.subContent.update({
      where: { id },
      data: payload,
    });
    return toStrapiLike(sub.id, {
      title: sub.title,
      slug: sub.slug,
      order: sub.order,
      description: sub.description,
      parentCategoryId: sub.parentCategoryId,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.subContent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Sub-content not found');
    await this.prisma.subContent.delete({ where: { id } });
    return { deleted: true };
  }
}
