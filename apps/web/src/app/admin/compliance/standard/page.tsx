'use client';

import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminComplianceStandardPage() {
  return (
    <DocumentListPage
      title="Compliance — Standard"
      description="Manage standard compliance documents."
      type="GENERAL"
      categorySlug="standard"
      createHref="/admin/compliance/standard/new"
      editHref={(id) => `/admin/compliance/standard/${id}`}
    />
  );
}
