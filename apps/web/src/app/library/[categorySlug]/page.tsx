import { redirect } from 'next/navigation';

import { getCategoryBySlug } from '@/lib/api';
import { EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

/**
 * Legacy route: /library/[categorySlug]
 * Redirects to the correct section path (/procedure/:slug, /sustainability/:slug, /compliance/:slug)
 * so the URL reflects the existing menu structure.
 */
interface PageProps {
  params: Promise<{ categorySlug: string }>;
}

export default async function LibraryCategoryRedirectPage({ params }: PageProps) {
  const { categorySlug } = await params;
  const { data: category } = await getCategoryBySlug(categorySlug);

  if (!category) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <EmptyState
          type="no-data"
          title="Section not found"
          description="This section does not exist or is not public."
        />
      </div>
    );
  }

  const menuGroup = (category.attributes?.menuGroup as string) || 'procedure';
  redirect(`/${menuGroup}/${encodeURIComponent(categorySlug)}`);
}
