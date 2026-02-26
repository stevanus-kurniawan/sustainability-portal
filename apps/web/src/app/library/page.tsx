import { Suspense } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { CardSkeleton } from '@/components/ui';
import { getLibrary, getCategories } from '@/lib/api';

import { LibraryClient } from './LibraryClient';

export const metadata = {
  title: 'Document Library',
  description: 'Browse and download public sustainability documents',
};
export const dynamic = 'force-dynamic';

interface LibraryPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

async function LibraryContent({ searchParams }: LibraryPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 12;

  const [libraryResponse, categories] = await Promise.all([
    getLibrary({
      page,
      pageSize,
      search: params.search,
      category: params.category,
      sortBy: params.sortBy || 'publishedAt',
      sortOrder: params.sortOrder || 'desc',
    }),
    getCategories(),
  ]);

  const documents = libraryResponse.data || [];
  const totalPages = libraryResponse.meta?.pagination?.pageCount || 1;

  return (
    <LibraryClient
      initialDocuments={documents}
      categories={categories}
      totalPages={totalPages}
      currentPage={page}
    />
  );
}

function LibraryLoading() {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function LibraryPage(props: LibraryPageProps) {
  return (
    <div>
      <PageHeader
        title="Document Library"
        description="Browse and download our public sustainability documentation, including policies, reports, and compliance records."
      />
      <Suspense fallback={<LibraryLoading />}>
        <LibraryContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
