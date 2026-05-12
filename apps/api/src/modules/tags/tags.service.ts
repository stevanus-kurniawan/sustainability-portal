import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toStrapiLike } from '../../common/response';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: { includeAudit?: boolean } = {}) {
    const list = await this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
    return list.map((t: {
      id: number;
      name: string;
      slug: string;
      createdById?: string | null;
      updatedById?: string | null;
      createdAt: Date;
      updatedAt: Date;
    }) =>
      toStrapiLike(t.id, {
        name: t.name,
        slug: t.slug,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        ...(options.includeAudit && {
          createdById: t.createdById ?? null,
          updatedById: t.updatedById ?? null,
        }),
      }),
    );
  }

  async findOne(id: number) {
    return this.prisma.tag.findUnique({ where: { id } });
  }

  async create(data: { name: string; slug: string }, adminId?: string) {
    return this.prisma.tag.create({
      data: {
        ...data,
        createdById: adminId ?? undefined,
        updatedById: adminId ?? undefined,
      },
    });
  }

  async update(id: number, data: { name?: string; slug?: string }, adminId?: string) {
    return this.prisma.tag.update({
      where: { id },
      data: { ...data, updatedById: adminId ?? undefined },
    });
  }

  async remove(id: number) {
    return this.prisma.tag.delete({ where: { id } });
  }
}
