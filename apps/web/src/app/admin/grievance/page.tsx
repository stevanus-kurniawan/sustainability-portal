'use client';

import { DocumentListPage } from '../components/DocumentListPage';

export default function AdminGrievancePage() {
  return (
    <DocumentListPage
      title="Grievance"
      description="Manage grievance documents. Upload documents for users to view and download."
      type="GRIEVANCE"
      createHref="/admin/grievance/new"
      editHref={(id) => `/admin/grievance/${id}`}
    />
  );
}
