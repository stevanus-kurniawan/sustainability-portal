'use client';

import { DocumentForm } from '../../components/DocumentForm';

export default function AdminUpdatesNewPage() {
  return (
    <DocumentForm
      type="GENERAL"
      contentVersion="V2"
      updatesMode
      hideCategoryPicker
      backHref="/admin/updates"
      title="New Update"
    />
  );
}
