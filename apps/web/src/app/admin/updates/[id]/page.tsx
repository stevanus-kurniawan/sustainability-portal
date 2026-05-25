'use client';

import { useParams } from 'next/navigation';

import { DocumentForm } from '../../components/DocumentForm';

export default function AdminUpdatesEditPage() {
  const params = useParams();
  const id = parseInt(String(params.id), 10);

  return (
    <DocumentForm
      id={id}
      type="GENERAL"
      contentVersion="V2"
      updatesMode
      hideCategoryPicker
      backHref="/admin/updates"
      title="Edit Update"
    />
  );
}
