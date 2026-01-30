'use client';

import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminComplianceInternationalPage() {
  return (
    <DocumentListPage
      title="Compliance — International"
      description="Manage international compliance documents."
      type="GENERAL"
      categorySlug="international"
      createHref="/admin/compliance/international/new"
      editHref={(id) => `/admin/compliance/international/${id}`}
    />
  );
}
