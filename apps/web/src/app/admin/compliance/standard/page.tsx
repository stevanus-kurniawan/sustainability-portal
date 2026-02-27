'use client';

import { useSearchParams } from 'next/navigation';
import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminComplianceStandardPage() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!, 10) : undefined;
  const subContentId = searchParams.get('subContentId') ? parseInt(searchParams.get('subContentId')!, 10) : undefined;
  const createHref = subContentId != null && categoryId != null
    ? `/admin/compliance/standard/new?categoryId=${categoryId}&subContentId=${subContentId}`
    : '/admin/compliance/standard/new';

  return (
    <DocumentListPage
      title="Compliance — Standard"
      description="Manage standard compliance documents."
      type="GENERAL"
      categorySlug="standard"
      categoryId={categoryId}
      subContentId={subContentId}
      createHref={createHref}
      editHref={(id) => `/admin/compliance/standard/${id}`}
    />
  );
}
