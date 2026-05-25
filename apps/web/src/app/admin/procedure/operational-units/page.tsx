'use client';

import { DocumentListPage } from '../../components/DocumentListPage';

export default function AdminProcedureOperationalUnitsPage() {
  return (
    <DocumentListPage
      title="Procedure — Operational Unit"
      description="Manage v2 procedure records for each operational unit."
      type="GENERAL"
      contentVersion="V2"
      procedureScope="OPERATIONAL_UNIT"
      createHref="/admin/procedure/operational-units/new"
      editHref={(id) => `/admin/procedure/operational-units/${id}`}
    />
  );
}
