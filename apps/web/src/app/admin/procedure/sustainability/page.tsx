'use client';

import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminProcedureSustainabilityPage() {
  return (
    <DocumentListPage
      title="Procedure — Sustainability"
      description="Manage v2 sustainability procedure records."
      type="GENERAL"
      contentVersion="V2"
      procedureScope="SUSTAINABILITY"
      createHref="/admin/procedure/sustainability/new"
      editHref={(id) => `/admin/procedure/sustainability/${id}`}
    />
  );
}
