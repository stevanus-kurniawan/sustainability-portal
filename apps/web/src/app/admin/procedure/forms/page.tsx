'use client';

import { useSearchParams } from 'next/navigation';
import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminProcedureFormsPage() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!, 10) : undefined;
  const subContentId = searchParams.get('subContentId') ? parseInt(searchParams.get('subContentId')!, 10) : undefined;
  const createHref = subContentId != null && categoryId != null
    ? `/admin/procedure/forms/new?categoryId=${categoryId}&subContentId=${subContentId}`
    : '/admin/procedure/forms/new';

  return (
    <DocumentListPage
      title="Forms"
      description="Manage form documents."
      type="GENERAL"
      categorySlug="form"
      categoryId={categoryId}
      subContentId={subContentId}
      createHref={createHref}
      editHref={(id) => `/admin/procedure/forms/${id}`}
    />
  );
}
