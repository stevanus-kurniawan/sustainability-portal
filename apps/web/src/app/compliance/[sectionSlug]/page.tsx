import { notFound } from 'next/navigation';

import { getCategoryBySlug, getSubContents, getLibrary, getLicenses } from '@/lib/api';
import { getSectionConfigOrDefault } from '@/config/sections';
import { PageHeader } from '@/components/PageHeader';
import { SectionSubContentList } from '@/components/section/SectionSubContentList';
import { SectionDocumentsClient } from '@/components/section/SectionDocumentsClient';
import { ComplianceLicensesSectionClient } from '@/components/section/ComplianceLicensesSectionClient';

export const dynamic = 'force-dynamic';

const MENU_GROUP = 'compliance';
const SECTION_PATH = 'compliance';
/** When this section is Licenses and mode is DIRECT, show licenses (from License table) instead of library documents. */
const LICENSE_SLUGS = ['license', 'licenses'];
/** Try license slug variant when the requested slug has no category (e.g. /compliance/license vs DB slug "licenses"). */
const LICENSE_SLUG_ALIASES = ['license', 'licenses'];

interface PageProps {
  params: Promise<{ sectionSlug: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { sectionSlug } = await params;
  const slugLower = sectionSlug.toLowerCase();
  if (LICENSE_SLUG_ALIASES.includes(slugLower)) {
    const config = getSectionConfigOrDefault(MENU_GROUP, slugLower, 'Licenses', 'Compliance: Licenses');
    return { title: config.title, description: config.description };
  }
  let category = (await getCategoryBySlug(sectionSlug)).data;
  if (!category && LICENSE_SLUG_ALIASES.includes(slugLower)) {
    const otherSlug = slugLower === 'license' ? 'licenses' : 'license';
    category = (await getCategoryBySlug(otherSlug)).data;
  }
  if (!category) return { title: 'Compliance' };
  const slug = (category.attributes?.slug as string) ?? sectionSlug;
  const isLicenseSlug = LICENSE_SLUG_ALIASES.includes(slug.toLowerCase());
  const menuGroup = (category.attributes?.menuGroup as string) ?? '';
  if (menuGroup.toLowerCase() !== MENU_GROUP.toLowerCase() && !isLicenseSlug) return { title: 'Compliance' };
  const config = getSectionConfigOrDefault(MENU_GROUP, slug, category.attributes?.name ?? slug, `Compliance: ${slug}`);
  return { title: config.title, description: config.description };
}

async function fetchCategorySafe(slug: string): Promise<{ data: Category | null }['data']> {
  try {
    const result = await getCategoryBySlug(slug);
    return result.data;
  } catch {
    return null;
  }
}

async function fetchLicensesSafe(pageSize: number): Promise<Awaited<ReturnType<typeof getLicenses>>['data']> {
  try {
    const res = await getLicenses({ pageSize });
    return res.data ?? [];
  } catch {
    return [];
  }
}

export default async function ComplianceSectionPage({ params, searchParams }: PageProps) {
  const { sectionSlug: rawSlug } = await params;
  const sectionSlug = typeof rawSlug === 'string' ? rawSlug : '';
  const { page: pageParam, search: searchQuery } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1);
  const pageSize = 12;
  const search = searchQuery?.trim() || undefined;
  const slugLower = sectionSlug.toLowerCase().trim();
  const isLicenseUrl = slugLower === 'license' || slugLower === 'licenses';

  // For /compliance/license or /compliance/licenses: always show license page (never 404)
  if (isLicenseUrl) {
    try {
      let category = await fetchCategorySafe(sectionSlug);
      if (!category) {
        const otherSlug = slugLower === 'license' ? 'licenses' : 'license';
        category = await fetchCategorySafe(otherSlug);
      }
      const config = category
        ? getSectionConfigOrDefault(MENU_GROUP, (category.attributes?.slug as string)?.trim().toLowerCase() ?? slugLower, category.attributes?.name ?? 'Licenses', 'Compliance: Licenses')
        : getSectionConfigOrDefault(MENU_GROUP, slugLower, 'Licenses', 'Compliance: Licenses');
      const licenses = await fetchLicensesSafe(100);
      return <ComplianceLicensesSectionClient config={config} licenses={licenses ?? []} />;
    } catch {
      const config = getSectionConfigOrDefault(MENU_GROUP, slugLower || 'license', 'Licenses', 'Compliance: Licenses');
      return <ComplianceLicensesSectionClient config={config} licenses={[]} />;
    }
  }

  let category = await fetchCategorySafe(sectionSlug);
  if (!category) notFound();

  const resolvedSlug = ((category.attributes?.slug as string) ?? sectionSlug).trim().toLowerCase();
  const menuGroup = ((category.attributes?.menuGroup as string) ?? '').trim().toLowerCase();
  const isCompliance = menuGroup === MENU_GROUP.toLowerCase();
  if (!isCompliance) notFound();

  const mode = category.attributes?.mode ?? 'DIRECT';
  const name = category.attributes?.name ?? resolvedSlug;
  const config = getSectionConfigOrDefault(MENU_GROUP, resolvedSlug, name, `Compliance: ${name}`);

  if (mode === 'DIRECT') {
    const isLicenseSection = LICENSE_SLUGS.includes(resolvedSlug);
    if (isLicenseSection) {
      const { data: licenses } = await getLicenses({ pageSize: 100 });
      return <ComplianceLicensesSectionClient config={config} licenses={licenses ?? []} />;
    }
    const { data: documents, meta } = await getLibrary({
      category: sectionSlug,
      page,
      pageSize,
      search,
      sortBy: 'publishedAt',
      sortOrder: 'desc',
    });
    const totalPages = meta?.pagination?.pageCount ?? 1;
    return (
      <div>
        <PageHeader
          title={config.title}
          description={config.description}
          bannerImage={config.bannerImage}
        />
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionDocumentsClient
              initialDocuments={documents ?? []}
              totalPages={totalPages}
              currentPage={page}
              sectionPath={`${SECTION_PATH}/${sectionSlug}`}
              categoryName={name}
              viewModeStorageKey={
                ['national', 'international', 'standard'].includes(resolvedSlug)
                  ? `compliance-${resolvedSlug}-public`
                  : undefined
              }
              defaultViewMode="table"
              preferDefaultViewMode={resolvedSlug === 'international'}
              tableColumns="simple"
            />
          </div>
        </section>
      </div>
    );
  }

  const { data: subContents } = await getSubContents(sectionSlug);
  const list = subContents ?? [];

  return (
    <SectionSubContentList
      sectionName={name}
      sectionPath={`${SECTION_PATH}/${sectionSlug}`}
      subContents={list}
      description={config.description}
      bannerImage={config.bannerImage}
    />
  );
}
