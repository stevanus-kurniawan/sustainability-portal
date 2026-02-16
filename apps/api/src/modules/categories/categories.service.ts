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
      select: {
        id: true,
        name: true,
        slug: true,
        menuGroup: true,
        mode: true,
        isPublic: true,
        displayOrder: true,
      },
    });
    return list.map((c: {
      id: number;
      name: string;
      slug: string;
      menuGroup: string | null;
      mode: string;
      isPublic: boolean;
      displayOrder: number;
    }) =>
      toStrapiLike(c.id, {
        name: c.name,
        slug: c.slug,
        menuGroup: c.menuGroup,
        mode: c.mode,
        isPublic: c.isPublic,
        displayOrder: c.displayOrder,
      }),
    );
  }

  async findOne(id: number) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  /** Public: get category by slug (must be public). Returns null if not found or not public. */
  async findBySlugPublic(slug: string) {
    const c = await this.prisma.category.findFirst({
      where: { slug, isPublic: true },
    });
    if (!c) return null;
    return toStrapiLike(c.id, {
      name: c.name,
      slug: c.slug,
      menuGroup: c.menuGroup,
      mode: c.mode,
      isPublic: c.isPublic,
      displayOrder: c.displayOrder,
    });
  }

  async create(data: {
    name: string;
    slug: string;
    menuGroup?: string | null;
    mode?: 'DIRECT' | 'WITH_SUBCONTENT';
    isPublic?: boolean;
    displayOrder?: number;
  }) {
    return this.prisma.category.create({
      data: { ...data, mode: data.mode ?? 'DIRECT' },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      slug?: string;
      menuGroup?: string | null;
      mode?: 'DIRECT' | 'WITH_SUBCONTENT';
      isPublic?: boolean;
      displayOrder?: number;
    },
  ) {
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
      { slug: 'license', label: 'License' },
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

    const toChild = (c: { name: string; slug: string; menuGroup: string | null; mode: 'DIRECT' | 'WITH_SUBCONTENT' }) => {
      const menuGroup = c.menuGroup || 'procedure';
      const base = `/${menuGroup}/${c.slug}`;
      return { label: c.name, href: base };
    };

    const existingHrefs = (children: Array<{ label: string; href: string }>) => new Set(children.map((ch) => ch.href));

    let procedure = categories
      .filter((c) => c.menuGroup === 'procedure')
      .map(toChild);
    let sustainability = categories
      .filter((c) => c.menuGroup === 'sustainability' || (c.menuGroup == null && c.mode === 'WITH_SUBCONTENT'))
      .map((c) => ({ label: c.name, href: `/${c.menuGroup || 'sustainability'}/${c.slug}` }));
    let compliance = categories
      .filter((c) => c.menuGroup === 'compliance')
      .map(toChild);

    // Use fallback when empty; otherwise merge in any fallback items not already in the DB list (e.g. License under Compliance)
    const procedureHrefs = existingHrefs(procedure);
    if (procedure.length === 0) {
      procedure = CategoriesService.NAV_FALLBACK.procedure.map(({ slug, label }) => ({
        label,
        href: `/procedure/${slug}`,
      }));
    } else {
      for (const { slug, label } of CategoriesService.NAV_FALLBACK.procedure) {
        const href = `/procedure/${slug}`;
        if (!procedureHrefs.has(href)) {
          procedure.push({ label, href });
          procedureHrefs.add(href);
        }
      }
    }

    const sustainabilityHrefs = existingHrefs(sustainability);
    if (sustainability.length === 0) {
      sustainability = CategoriesService.NAV_FALLBACK.sustainability.map(({ slug, label }) => ({
        label,
        href: `/sustainability/${slug}`,
      }));
    } else {
      for (const { slug, label } of CategoriesService.NAV_FALLBACK.sustainability) {
        const href = `/sustainability/${slug}`;
        if (!sustainabilityHrefs.has(href)) {
          sustainability.push({ label, href });
          sustainabilityHrefs.add(href);
        }
      }
    }

    const complianceHrefs = existingHrefs(compliance);
    if (compliance.length === 0) {
      compliance = CategoriesService.NAV_FALLBACK.compliance.map(({ slug, label }) => ({
        label,
        href: `/compliance/${slug}`,
      }));
    } else {
      for (const { slug, label } of CategoriesService.NAV_FALLBACK.compliance) {
        const href = `/compliance/${slug}`;
        if (!complianceHrefs.has(href)) {
          compliance.push({ label, href });
          complianceHrefs.add(href);
        }
      }
    }

    const items: Array<
      { label: string; href: string } | { label: string; children: Array<{ label: string; href: string }> }
    > = [
      { label: 'Overview', href: '/' },
      { label: 'Policy', href: '/policies' },
      { label: 'Procedure', children: procedure },
      {
        label: 'Sustainability',
        children: sustainability,
      },
      {
        label: 'Compliance',
        children: compliance,
      },
      { label: 'Grievance', href: '/grievance' },
    ];

    return { items };
  }
}
