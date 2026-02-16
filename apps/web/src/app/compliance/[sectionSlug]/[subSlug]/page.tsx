import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/PageHeader';
import { getCategoryBySlug, getSubContents, getSubContentDocuments, getSubContentLicenses } from '@/lib/api';
import { SubContentDocumentsClient } from '@/app/library/[categorySlug]/[subSlug]/SubContentDocumentsClient';
import { SubContentLicensesClient } from '@/components/section/SubContentLicensesClient';

export const dynamic = 'force-dynamic';

const MENU_GROUP = 'compliance';
const SECTION_PATH = 'compliance';

interface PageProps {
  params: Promise<{ sectionSlug: string; subSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { sectionSlug, subSlug } = await params;
  const { data: category } = await getCategoryBySlug(sectionSlug);
  if (!category || (category.attributes?.menuGroup as string) !== MENU_GROUP) return { title: 'Compliance' };
  const categoryName = category.attributes?.name ?? sectionSlug;
  const { data: subList } = await getSubContents(sectionSlug);
  const sub = subList?.find((s) => s.attributes.slug === subSlug);
  const subTitle = sub?.attributes?.title ?? subSlug;
  return { title: `${subTitle} | ${categoryName}`, description: `Documents for ${subTitle}` };
}

const LICENSE_SLUGS = ['license', 'licenses'];

export default async function ComplianceSectionSubPage({ params, searchParams }: PageProps) {
  const { sectionSlug, subSlug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1);
  const pageSize = 12;
  const isLicenseSection = LICENSE_SLUGS.includes(sectionSlug.toLowerCase());

  let category: Awaited<ReturnType<typeof getCategoryBySlug>>['data'];
  let subList: Awaited<ReturnType<typeof getSubContents>>['data'];
  let docResponse: Awaited<ReturnType<typeof getSubContentDocuments>>;
  let licensesResponse: Awaited<ReturnType<typeof getSubContentLicenses>>;
  try {
    const [catRes, subRes, docRes, licRes] = await Promise.all([
      getCategoryBySlug(sectionSlug),
      getSubContents(sectionSlug),
      isLicenseSection
        ? Promise.resolve({ data: [], meta: { pagination: { pageCount: 1 } } })
        : getSubContentDocuments(sectionSlug, subSlug, { page, pageSize }),
      isLicenseSection
        ? getSubContentLicenses(sectionSlug, subSlug, { page, pageSize })
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

  const categoryName = category.attributes?.name ?? sectionSlug;
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
              categorySlug={sectionSlug}
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
            categorySlug={sectionSlug}
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
