import { notFound } from 'next/navigation';

import { getCategoryBySlug, getSubContents, getLibrary } from '@/lib/api';
import { getSectionConfigOrDefault } from '@/config/sections';
import { PageHeader } from '@/components/PageHeader';
import { SectionSubContentList } from '@/components/section/SectionSubContentList';
import { SectionDocumentsClient } from '@/components/section/SectionDocumentsClient';

export const dynamic = 'force-dynamic';

const MENU_GROUP = 'procedure';
const SECTION_PATH = 'procedure';

interface PageProps {
  params: Promise<{ sectionSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { sectionSlug } = await params;
  const { data: category } = await getCategoryBySlug(sectionSlug);
  if (!category || (category.attributes?.menuGroup as string) !== MENU_GROUP) return { title: 'Procedure' };
  const config = getSectionConfigOrDefault(MENU_GROUP, sectionSlug, category.attributes?.name ?? sectionSlug, `Procedure: ${sectionSlug}`);
  return { title: config.title, description: config.description };
}

export default async function ProcedureSectionPage({ params, searchParams }: PageProps) {
  const { sectionSlug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1);
  const pageSize = 12;

  const { data: category } = await getCategoryBySlug(sectionSlug);

  if (!category || (category.attributes?.menuGroup as string) !== MENU_GROUP) notFound();

  const mode = category.attributes?.mode ?? 'DIRECT';
  const name = category.attributes?.name ?? sectionSlug;
  const config = getSectionConfigOrDefault(MENU_GROUP, sectionSlug, name, `Procedure: ${name}`);

  if (mode === 'DIRECT') {
    const { data: documents, meta } = await getLibrary({
      category: sectionSlug,
      page,
      pageSize,
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
