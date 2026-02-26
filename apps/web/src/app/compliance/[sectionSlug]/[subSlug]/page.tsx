import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/PageHeader';
import { getCategoryBySlug, getSubContents, getSubContentDocuments, getSubContentLicenses } from '@/lib/api';
import { SubContentDocumentsClient } from '@/app/library/[categorySlug]/[subSlug]/SubContentDocumentsClient';
import { SubContentLicensesClient } from '@/components/section/SubContentLicensesClient';

export const dynamic = 'force-dynamic';

const MENU_GROUP = 'compliance';
const SECTION_PATH = 'compliance';
const LICENSE_SLUGS = ['license', 'licenses'];
const LICENSE_SLUG_ALIASES = ['license', 'licenses'];

async function resolveComplianceSectionSlug(sectionSlug: string): Promise<string> {
  const { data: category } = await getCategoryBySlug(sectionSlug);
  if (category && (category.attributes?.menuGroup as string) === MENU_GROUP) return (category.attributes?.slug as string) ?? sectionSlug;
  if (LICENSE_SLUG_ALIASES.includes(sectionSlug.toLowerCase())) {
    const otherSlug = sectionSlug.toLowerCase() === 'license' ? 'licenses' : 'license';
    const { data: alt } = await getCategoryBySlug(otherSlug);
    if (alt && (alt.attributes?.menuGroup as string) === MENU_GROUP) return (alt.attributes?.slug as string) ?? otherSlug;
  }
  return sectionSlug;
}

interface PageProps {
  params: Promise<{ sectionSlug: string; subSlug: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { sectionSlug, subSlug } = await params;
  const resolvedSlug = await resolveComplianceSectionSlug(sectionSlug);
  const { data: category } = await getCategoryBySlug(resolvedSlug);
  if (!category || (category.attributes?.menuGroup as string) !== MENU_GROUP) return { title: 'Compliance' };
  const categoryName = category.attributes?.name ?? resolvedSlug;
  const { data: subList } = await getSubContents(resolvedSlug);
  const sub = subList?.find((s) => s.attributes.slug === subSlug);
  const subTitle = sub?.attributes?.title ?? subSlug;
  return { title: `${subTitle} | ${categoryName}`, description: `Documents for ${subTitle}` };
}

export default async function ComplianceSectionSubPage({ params, searchParams }: PageProps) {
  const { sectionSlug, subSlug } = await params;
  const resolvedSlug = await resolveComplianceSectionSlug(sectionSlug);
  const { page: pageParam, search: searchParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1);
  const pageSize = 12;
  const search = typeof searchParam === 'string' ? searchParam.trim() : undefined;
  const isLicenseSection = LICENSE_SLUGS.includes(resolvedSlug.toLowerCase());

  let category: Awaited<ReturnType<typeof getCategoryBySlug>>['data'];
  let subList: Awaited<ReturnType<typeof getSubContents>>['data'];
  let docResponse: Awaited<ReturnType<typeof getSubContentDocuments>>;
  let licensesResponse: Awaited<ReturnType<typeof getSubContentLicenses>>;
  try {
    const [catRes, subRes, docRes, licRes] = await Promise.all([
      getCategoryBySlug(resolvedSlug),
      getSubContents(resolvedSlug),
      isLicenseSection
        ? Promise.resolve({ data: [], meta: { pagination: { pageCount: 1 } } })
        : getSubContentDocuments(resolvedSlug, subSlug, { page, pageSize }),
      isLicenseSection
        ? getSubContentLicenses(resolvedSlug, subSlug, { page, pageSize, search })
        : Promise.resolve({ data: [], meta: { pagination: { pageCount: 1 } } }),
    ]);
    category = catRes.data;
    subList = subRes.data;
    docResponse = docRes;
    licensesResponse = licRes;
  } catch {
    notFound();
  }

  if (!category || (category.attributes?.menuGroup as string) !== MENU_GROUP) notFound();
  const sub = subList?.find((s) => s.attributes.slug === subSlug);
  if (!sub) notFound();

  const categoryName = category.attributes?.name ?? resolvedSlug;
  const subTitle = sub.attributes?.title ?? subSlug;

  if (isLicenseSection) {
    const licenses = licensesResponse.data ?? [];
    const totalPages = licensesResponse.meta?.pagination?.pageCount ?? 1;
    return (
      <div>
        <PageHeader title={subTitle} description={`Licenses for ${subTitle}`} />
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SubContentLicensesClient
              initialLicenses={licenses}
              totalPages={totalPages}
              currentPage={page}
              categorySlug={resolvedSlug}
              subSlug={subSlug}
              categoryName={categoryName}
              subTitle={subTitle}
              sectionListHref={`/${SECTION_PATH}/${sectionSlug}`}
              currentSearch={search ?? ''}
            />
          </div>
        </section>
      </div>
    );
  }

  const documents = docResponse.data ?? [];
  const totalPages = docResponse.meta?.pagination?.pageCount ?? 1;
  return (
    <div>
      <PageHeader title={subTitle} description={`Documents and links for ${subTitle}`} />
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SubContentDocumentsClient
            initialDocuments={documents}
            totalPages={totalPages}
            currentPage={page}
            categorySlug={resolvedSlug}
            subSlug={subSlug}
            categoryName={categoryName}
            subTitle={subTitle}
            sectionListHref={`/${SECTION_PATH}/${sectionSlug}`}
          />
        </div>
      </section>
    </div>
  );
}
