'use client';

import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminRegulationsPage() {
  return (
    <DocumentListPage
      title="Regulations"
      description="Manage v2 National and International regulation records."
      type="GENERAL"
      contentVersion="V2"
      regulationOnly
      createHref="/admin/compliance/regulations/new"
      editHref={(id) => `/admin/compliance/regulations/${id}`}
    />
  );
}
