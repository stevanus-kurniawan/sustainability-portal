'use client';

import { DocumentForm } from '../../components/DocumentForm';

export default function AdminGrievanceNewPage() {
  return (
    <DocumentForm
      type="GRIEVANCE"
      backHref="/admin/grievance"
      title="New Grievance Document"
    />
  );
}
