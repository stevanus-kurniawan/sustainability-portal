'use client';

import { DocumentForm } from '../../../components/DocumentForm';

export default function AdminProcedureOperationalUnitsNewPage() {
  return (
    <DocumentForm
      type="GENERAL"
      contentVersion="V2"
      procedureScope="OPERATIONAL_UNIT"
      backHref="/admin/procedure/operational-units"
      title="New Operational Unit Procedure"
    />
  );
}
