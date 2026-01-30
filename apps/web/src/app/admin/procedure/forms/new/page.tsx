'use client';

import { DocumentForm } from '../../../components/DocumentForm';

export default function AdminProcedureFormsNewPage() {
  return (
    <DocumentForm
      type="GENERAL"
      categorySlug="form"
      backHref="/admin/procedure/forms"
      title="New Form"
    />
  );
}
