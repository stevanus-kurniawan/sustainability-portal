import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toStrapiLike } from '../../common/response';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const list = await this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
    return list.map((t: { id: number; name: string; slug: string }) =>
      toStrapiLike(t.id, { name: t.name, slug: t.slug }),
    );
  }

  async findOne(id: number) {
    return this.prisma.tag.findUnique({ where: { id } });
  }

  async create(data: { name: string; slug: string }) {
    return this.prisma.tag.create({ data });
  }

  async update(id: number, data: { name?: string; slug?: string }) {
    return this.prisma.tag.update({ where: { id }, data });
  }

  async remove(id: number) {
    return this.prisma.tag.delete({ where: { id } });
  }
}
