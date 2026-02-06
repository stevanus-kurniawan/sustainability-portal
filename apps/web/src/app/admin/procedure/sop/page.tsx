'use client';

import { useSearchParams } from 'next/navigation';
import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminProcedureSOPPage() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!, 10) : undefined;
  const subContentId = searchParams.get('subContentId') ? parseInt(searchParams.get('subContentId')!, 10) : undefined;
  const createHref = subContentId != null && categoryId != null
    ? `/admin/procedure/sop/new?categoryId=${categoryId}&subContentId=${subContentId}`
    : '/admin/procedure/sop/new';

  return (
    <DocumentListPage
      title="SOP"
      description="Manage SOP documents."
      type="GENERAL"
      categorySlug="sop"
      categoryId={categoryId}
      subContentId={subContentId}
      createHref={createHref}
      editHref={(id) => `/admin/procedure/sop/${id}`}
    />
  );
}
