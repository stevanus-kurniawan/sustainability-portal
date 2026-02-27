'use client';

import { useSearchParams } from 'next/navigation';
import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminSustainabilityReportsPage() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!, 10) : undefined;
  const subContentId = searchParams.get('subContentId') ? parseInt(searchParams.get('subContentId')!, 10) : undefined;
  const createHref = subContentId != null && categoryId != null
    ? `/admin/sustainability/reports/new?categoryId=${categoryId}&subContentId=${subContentId}`
    : '/admin/sustainability/reports/new';

  return (
    <DocumentListPage
      title="Sustainability Reports"
      description="Manage sustainability report documents."
      type="GENERAL"
      categorySlug="sustainability-report"
      categoryId={categoryId}
      subContentId={subContentId}
      createHref={createHref}
      editHref={(id) => `/admin/sustainability/reports/${id}`}
    />
  );
}
