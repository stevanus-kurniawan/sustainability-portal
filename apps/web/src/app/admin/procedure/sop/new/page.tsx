'use client';

import { DocumentForm } from '../../../components/DocumentForm';

export default function AdminProcedureSOPNewPage() {
  return (
    <DocumentForm
      type="GENERAL"
      categorySlug="sop"
      backHref="/admin/procedure/sop"
      title="New SOP"
    />
  );
}
