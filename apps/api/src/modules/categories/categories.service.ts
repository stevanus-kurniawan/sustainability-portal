import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toStrapiLike } from '../../common/response';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(wherePublic?: boolean) {
    const list = await this.prisma.category.findMany({
      where: wherePublic ? { isPublic: true } : undefined,
      orderBy: { displayOrder: 'asc' },
    });
    return list.map((c) => toStrapiLike(c.id, {
      name: c.name,
      slug: c.slug,
      menuGroup: c.menuGroup,
      isPublic: c.isPublic,
      displayOrder: c.displayOrder,
    }));
  }

  async findOne(id: number) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  async create(data: { name: string; slug: string; menuGroup?: string | null; isPublic?: boolean; displayOrder?: number }) {
    return this.prisma.category.create({ data });
  }

  async update(id: number, data: { name?: string; slug?: string; menuGroup?: string | null; isPublic?: boolean; displayOrder?: number }) {
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: number) {
    return this.prisma.category.delete({ where: { id } });
  }

  /** Expected submenu structure when DB categories have no menuGroup (fallback). */
  private static readonly NAV_FALLBACK: Record<
    string,
    Array<{ slug: string; label: string }>
  > = {
    procedure: [
      { slug: 'sop', label: 'SOP' },
      { slug: 'form', label: 'Form' },
    ],
    sustainability: [
      { slug: 'sustainability-report', label: 'Sustainability Report' },
    ],
    compliance: [
      { slug: 'national', label: 'National' },
      { slug: 'international', label: 'International' },
      { slug: 'standard', label: 'Standard' },
    ],
  };

  /** Build public header navigation from categories (grouped by menuGroup) + static items. */
  async getNavigationForPublic(): Promise<{
    items: Array<
      | { label: string; href: string }
      | { label: string; children: Array<{ label: string; href: string }> }
    >;
  }> {
    const categories = await this.prisma.category.findMany({
      where: { isPublic: true },
      orderBy: { displayOrder: 'asc' },
    });

    const toChild = (c: { name: string; slug: string }) => ({
      label: c.name,
      href: `/library?category=${encodeURIComponent(c.slug)}`,
    });

    let procedure = categories
      .filter((c) => c.menuGroup === 'procedure')
      .map(toChild);
    let sustainability = categories
      .filter((c) => c.menuGroup === 'sustainability')
      .map(toChild);
    let compliance = categories
      .filter((c) => c.menuGroup === 'compliance')
      .map(toChild);

    if (procedure.length === 0) {
      procedure = CategoriesService.NAV_FALLBACK.procedure.map(({ slug, label }) => ({
        label,
        href: `/library?category=${encodeURIComponent(slug)}`,
      }));
    }
    if (sustainability.length === 0) {
      sustainability = CategoriesService.NAV_FALLBACK.sustainability.map(({ slug, label }) => ({
        label,
        href: `/library?category=${encodeURIComponent(slug)}`,
      }));
    }
    if (compliance.length === 0) {
      compliance = CategoriesService.NAV_FALLBACK.compliance.map(({ slug, label }) => ({
        label,
        href: `/library?category=${encodeURIComponent(slug)}`,
      }));
    }

    const items: Array<
      { label: string; href: string } | { label: string; children: Array<{ label: string; href: string }> }
    > = [
      { label: 'Overview', href: '/' },
      { label: 'Policy', href: '/policies' },
      { label: 'Procedure', children: procedure },
      {
        label: 'Sustainability',
        children: [...sustainability, { label: 'Certificate', href: '/certifications' }],
      },
      {
        label: 'Compliance',
        children: [...compliance, { label: 'License', href: '/licenses' }],
      },
      { label: 'Grievance', href: '/grievance' },
    ];

    return { items };
  }
}
