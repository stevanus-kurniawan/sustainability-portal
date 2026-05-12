'use client';

import { DocumentForm } from '../../../components/DocumentForm';

export default function AdminRegulationsNewPage() {
  return (
    <DocumentForm
      type="GENERAL"
      contentVersion="V2"
      regulationKind="NATIONAL"
      hideCategoryPicker
      backHref="/admin/compliance/regulations"
      title="New Regulation"
    />
  );
}
