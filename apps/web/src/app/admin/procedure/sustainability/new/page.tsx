'use client';

import { DocumentForm } from '../../../components/DocumentForm';

export default function AdminProcedureSustainabilityNewPage() {
  return (
    <DocumentForm
      type="GENERAL"
      contentVersion="V2"
      procedureScope="SUSTAINABILITY"
      backHref="/admin/procedure/sustainability"
      title="New Sustainability Procedure"
    />
  );
}
