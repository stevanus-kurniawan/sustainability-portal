'use client';

import { DocumentListPage } from '../components/DocumentListPage';

export default function AdminUpdatesPage() {
  return (
    <DocumentListPage
      title="Updates"
      description="Manage portal update announcements."
      type="GENERAL"
      contentVersion="V2"
      updateOnly
      createHref="/admin/updates/new"
      editHref={(id) => `/admin/updates/${id}`}
    />
  );
}
