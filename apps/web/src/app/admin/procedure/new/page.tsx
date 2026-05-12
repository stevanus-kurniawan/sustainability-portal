'use client';

import { DocumentForm } from '../../components/DocumentForm';

export default function AdminProcedureNewPage() {
  return (
    <DocumentForm
      type="GENERAL"
      contentVersion="V2"
      procedureUnified
      backHref="/admin/procedure"
      title="New Procedure"
    />
  );
}
