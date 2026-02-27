'use client';

import { useSearchParams } from 'next/navigation';
import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminComplianceNationalPage() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!, 10) : undefined;
  const subContentId = searchParams.get('subContentId') ? parseInt(searchParams.get('subContentId')!, 10) : undefined;
  const createHref = subContentId != null && categoryId != null
    ? `/admin/compliance/national/new?categoryId=${categoryId}&subContentId=${subContentId}`
    : '/admin/compliance/national/new';

  return (
    <DocumentListPage
      title="Compliance — National"
      description="Manage national compliance documents."
      type="GENERAL"
      categorySlug="national"
      categoryId={categoryId}
      subContentId={subContentId}
      createHref={createHref}
      editHref={(id) => `/admin/compliance/national/${id}`}
    />
  );
}
