import { redirect } from 'next/navigation';

import { getCategoryBySlug } from '@/lib/api';
import { EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

/**
 * Legacy route: /library/[categorySlug]/[subSlug]
 * Redirects to the correct section path (e.g. /sustainability/certificate/jakarta).
 */
interface PageProps {
  params: Promise<{ categorySlug: string; subSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function LibrarySubContentRedirectPage({ params, searchParams }: PageProps) {
  const { categorySlug, subSlug } = await params;
  const { data: category } = await getCategoryBySlug(categorySlug);

  if (!category) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <EmptyState type="no-data" title="Section not found" description="This section does not exist or is not public." />
      </div>
    );
  }

  const menuGroup = (category.attributes?.menuGroup as string) || 'procedure';
  const pageParam = (await searchParams).page;
  const query = pageParam && pageParam !== '1' ? `?page=${pageParam}` : '';
  redirect(`/${menuGroup}/${encodeURIComponent(categorySlug)}/${encodeURIComponent(subSlug)}${query}`);
}
