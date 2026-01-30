'use client';

import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminProcedureSOPPage() {
  return (
    <DocumentListPage
      title="SOP (Standard Operating Procedures)"
      description="Manage SOP documents."
      type="GENERAL"
      categorySlug="sop"
      createHref="/admin/procedure/sop/new"
      editHref={(id) => `/admin/procedure/sop/${id}`}
    />
  );
}
