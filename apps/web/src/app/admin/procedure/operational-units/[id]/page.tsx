'use client';

import { useParams } from 'next/navigation';
import { DocumentForm } from '../../../components/DocumentForm';

export default function AdminProcedureOperationalUnitsEditPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? parseInt(params.id, 10) : undefined;
  if (id == null || Number.isNaN(id)) return <div className="p-8 text-steel">Invalid ID</div>;
  return (
    <DocumentForm
      id={id}
      type="GENERAL"
      contentVersion="V2"
      procedureScope="OPERATIONAL_UNIT"
      backHref="/admin/procedure/operational-units"
      title="Edit Operational Unit Procedure"
    />
  );
}
