import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/PageHeader';
import { getCategoryBySlug, getSubContents, getSubContentDocuments, getSubContentCertifications } from '@/lib/api';
import { SubContentDocumentsClient } from '@/app/library/[categorySlug]/[subSlug]/SubContentDocumentsClient';
import { SubContentCertificationsClient } from '@/components/section/SubContentCertificationsClient';

export const dynamic = 'force-dynamic';

const MENU_GROUP = 'sustainability';
const SECTION_PATH = 'sustainability';

interface PageProps {
  params: Promise<{ sectionSlug: string; subSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { sectionSlug, subSlug } = await params;
  const { data: category } = await getCategoryBySlug(sectionSlug);
  if (!category || (category.attributes?.menuGroup as string) !== MENU_GROUP) return { title: 'Sustainability' };
  const categoryName = category.attributes?.name ?? sectionSlug;
  const { data: subList } = await getSubContents(sectionSlug);
  const sub = subList?.find((s) => s.attributes.slug === subSlug);
  const subTitle = sub?.attributes?.title ?? subSlug;
  const descType = sectionSlug === 'certificate' ? 'Certifications' : 'Documents';
  return { title: `${subTitle} | ${categoryName}`, description: `${descType} for ${subTitle}` };
}

export default async function SustainabilitySectionSubPage({ params, searchParams }: PageProps) {
  const { sectionSlug, subSlug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1);
  const pageSize = 12;
  const isCertificateSection = sectionSlug === 'certificate';
  const contentFetch = isCertificateSection
    ? getSubContentCertifications(sectionSlug, subSlug, { page, pageSize })
    : getSubContentDocuments(sectionSlug, subSlug, { page, pageSize });

  let category: Awaited<ReturnType<typeof getCategoryBySlug>>['data'];
  let subList: Awaited<ReturnType<typeof getSubContents>>['data'];
  let contentResponse: Awaited<ReturnType<typeof getSubContentDocuments>> | Awaited<ReturnType<typeof getSubContentCertifications>>;
  try {
    const [catRes, subRes, contentRes] = await Promise.all([
      getCategoryBySlug(sectionSlug),
      getSubContents(sectionSlug),
      contentFetch,
    ]);
    category = catRes.data;
    subList = subRes.data;
    contentResponse = contentRes;
  } catch {
    notFound();
  }

  if (!category || (category.attributes?.menuGroup as string) !== MENU_GROUP) notFound();
  const sub = subList?.find((s) => s.attributes.slug === subSlug);
  if (!sub) notFound();

  const categoryName = category.attributes?.name ?? sectionSlug;
  const subTitle = sub.attributes?.title ?? subSlug;

  if (isCertificateSection) {
    const certifications = contentResponse.data ?? [];
    const totalPages = contentResponse.meta?.pagination?.pageCount ?? 1;
    return (
      <div>
        <PageHeader title={subTitle} description={`Certifications for ${subTitle}`} />
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SubContentCertificationsClient
              initialCertifications={certifications}
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

  const documents = contentResponse.data ?? [];
  const totalPages = contentResponse.meta?.pagination?.pageCount ?? 1;
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
