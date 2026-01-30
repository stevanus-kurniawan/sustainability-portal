'use client';

import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminProcedureFormsPage() {
  return (
    <DocumentListPage
      title="Forms"
      description="Manage form documents."
      type="GENERAL"
      categorySlug="form"
      createHref="/admin/procedure/forms/new"
      editHref={(id) => `/admin/procedure/forms/${id}`}
    />
  );
}
