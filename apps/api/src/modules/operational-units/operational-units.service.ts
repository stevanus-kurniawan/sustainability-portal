import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toStrapiLike, wrapData } from '../../common/response';
import { CreateOperationalUnitDto } from './dto/create-operational-unit.dto';
import { UpdateOperationalUnitDto } from './dto/update-operational-unit.dto';

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class OperationalUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlugFromName(name: string, excludeId?: number): Promise<string> {
    const base = slugifyName(name);
    if (!base) throw new BadRequestException('Name must contain letters or numbers');
    let candidate = base;
    let attempt = 2;
    while (true) {
      const found = await this.prisma.operationalUnit.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!found) return candidate;
      candidate = `${base}-${attempt++}`;
    }
  }

  private mapRow(row: {
    id: number;
    name: string;
    slug: string;
    createdById?: string | null;
    updatedById?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }, options: { includeAudit?: boolean } = {}) {
    return toStrapiLike(row.id, {
      name: row.name,
      slug: row.slug,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      ...(options.includeAudit && {
        createdById: row.createdById ?? null,
        updatedById: row.updatedById ?? null,
      }),
    });
  }

  async findAll(options: { includeAudit?: boolean } = {}) {
    const rows = await this.prisma.operationalUnit.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return wrapData(rows.map((row) => this.mapRow(row, options)));
  }

  async findOne(id: number, options: { includeAudit?: boolean } = {}) {
    const row = await this.prisma.operationalUnit.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Operational unit not found');
    return this.mapRow(row, options);
  }

  async create(payload: CreateOperationalUnitDto, adminId?: string) {
    const name = payload.name.trim();
    if (!name) throw new BadRequestException('Name is required');
    const slug = await this.uniqueSlugFromName(name);
    const row = await this.prisma.operationalUnit.create({
      data: {
        name,
        slug,
        createdById: adminId ?? undefined,
        updatedById: adminId ?? undefined,
      },
    });
    return this.mapRow(row, { includeAudit: true });
  }

  async update(id: number, payload: UpdateOperationalUnitDto, adminId?: string) {
    const existing = await this.prisma.operationalUnit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Operational unit not found');

    const name = payload.name !== undefined ? payload.name.trim() : existing.name;
    if (!name) throw new BadRequestException('Name is required');
    const slug = name !== existing.name ? await this.uniqueSlugFromName(name, id) : existing.slug;

    const row = await this.prisma.operationalUnit.update({
      where: { id },
      data: {
        name,
        slug,
        updatedById: adminId ?? undefined,
      },
    });
    return this.mapRow(row, { includeAudit: true });
  }

  async remove(id: number) {
    const existing = await this.prisma.operationalUnit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Operational unit not found');
    await this.prisma.operationalUnit.delete({ where: { id } });
    return { ok: true };
  }
}
