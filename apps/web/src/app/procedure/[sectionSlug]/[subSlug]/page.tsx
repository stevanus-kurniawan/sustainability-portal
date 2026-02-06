import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/PageHeader';
import { getCategoryBySlug, getSubContents, getSubContentDocuments } from '@/lib/api';
import { SubContentDocumentsClient } from '@/app/library/[categorySlug]/[subSlug]/SubContentDocumentsClient';

export const dynamic = 'force-dynamic';

const MENU_GROUP = 'procedure';
const SECTION_PATH = 'procedure';

interface PageProps {
  params: Promise<{ sectionSlug: string; subSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { sectionSlug, subSlug } = await params;
  const { data: category } = await getCategoryBySlug(sectionSlug);
  if (!category || (category.attributes?.menuGroup as string) !== MENU_GROUP) return { title: 'Procedure' };
  const categoryName = category.attributes?.name ?? sectionSlug;
  const { data: subList } = await getSubContents(sectionSlug);
  const sub = subList?.find((s) => s.attributes.slug === subSlug);
  const subTitle = sub?.attributes?.title ?? subSlug;
  return { title: `${subTitle} | ${categoryName}`, description: `Documents for ${subTitle}` };
}

export default async function ProcedureSectionSubPage({ params, searchParams }: PageProps) {
  const { sectionSlug, subSlug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1);
  const pageSize = 12;

  const [{ data: category }, { data: subList }, docResponse] = await Promise.all([
    getCategoryBySlug(sectionSlug),
    getSubContents(sectionSlug),
    getSubContentDocuments(sectionSlug, subSlug, { page, pageSize }),
  ]);

  if (!category || (category.attributes?.menuGroup as string) !== MENU_GROUP) notFound();
  const sub = subList?.find((s) => s.attributes.slug === subSlug);
  if (!sub) notFound();

  const categoryName = category.attributes?.name ?? sectionSlug;
  const subTitle = sub.attributes?.title ?? subSlug;
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
