'use client';

import { useSearchParams } from 'next/navigation';
import { DocumentListPage } from '../components/DocumentListPage';
import Link from 'next/link';

export default function AdminDocumentsPage() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const subContentId = searchParams.get('subContentId');
  const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
  const subContentIdNum = subContentId ? parseInt(subContentId, 10) : undefined;

  const isSubContentFilter = categoryIdNum != null && subContentIdNum != null;

  return (
    <div>
      {isSubContentFilter && (
        <div className="mb-4 text-sm text-steel">
          <Link href="/admin/categories" className="hover:text-charcoal">Categories</Link>
          {' → '}
          <Link href={`/admin/categories/${categoryId}/sub-contents`} className="hover:text-charcoal">
            Sub-contents
          </Link>
          {' → Documents (filtered by sub-content)'}
        </div>
      )}
      <DocumentListPage
        title={isSubContentFilter ? 'Documents (sub-content)' : 'Documents'}
        description={
          isSubContentFilter
            ? 'Documents under this sub-content. To add a document here, create it with this category and sub-content selected (e.g. via API or document create form with sub-content support).'
            : 'Filter by category or sub-content via URL: ?categoryId=1&subContentId=2'
        }
        type="GENERAL"
        categoryId={categoryIdNum}
        subContentId={subContentIdNum}
        createHref={isSubContentFilter ? `/admin/documents/new?categoryId=${categoryId}&subContentId=${subContentIdNum}` : '/admin/categories'}
        editHref={(id) => `/admin/policies/${id}`}
        listKey="documents"
      />
    </div>
  );
}
