'use client';

import { DocumentListPage } from '../components/DocumentListPage';

export default function AdminProcedurePage() {
  return (
    <DocumentListPage
      title="Procedures"
      description="Manage holding company and operational unit procedures."
      type="GENERAL"
      contentVersion="V2"
      procedureOnly
      createHref="/admin/procedure/new"
      editHref={(id) => `/admin/procedure/${id}`}
    />
  );
}
