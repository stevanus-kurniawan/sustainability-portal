'use client';

import { useSearchParams } from 'next/navigation';
import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminComplianceInternationalPage() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!, 10) : undefined;
  const subContentId = searchParams.get('subContentId') ? parseInt(searchParams.get('subContentId')!, 10) : undefined;
  const createHref = subContentId != null && categoryId != null
    ? `/admin/compliance/international/new?categoryId=${categoryId}&subContentId=${subContentId}`
    : '/admin/compliance/international/new';

  return (
    <DocumentListPage
      title="Compliance — International"
      description="Manage international compliance documents."
      type="GENERAL"
      categorySlug="international"
      categoryId={categoryId}
      subContentId={subContentId}
      createHref={createHref}
      editHref={(id) => `/admin/compliance/international/${id}`}
    />
  );
}
