'use client';

import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminComplianceNationalPage() {
  return (
    <DocumentListPage
      title="Compliance — National"
      description="Manage national compliance documents."
      type="GENERAL"
      categorySlug="national"
      createHref="/admin/compliance/national/new"
      editHref={(id) => `/admin/compliance/national/${id}`}
    />
  );
}
