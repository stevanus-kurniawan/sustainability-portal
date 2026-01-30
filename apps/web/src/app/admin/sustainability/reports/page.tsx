'use client';

import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminSustainabilityReportsPage() {
  return (
    <DocumentListPage
      title="Sustainability Reports"
      description="Manage sustainability report documents."
      type="GENERAL"
      categorySlug="sustainability-report"
      createHref="/admin/sustainability/reports/new"
      editHref={(id) => `/admin/sustainability/reports/${id}`}
    />
  );
}
