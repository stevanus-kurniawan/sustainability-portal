'use client';

import { DocumentForm } from '../../../components/DocumentForm';

export default function AdminComplianceStandardNewPage() {
  return (
    <DocumentForm
      type="GENERAL"
      categorySlug="standard"
      hideCategoryPicker
      backHref="/admin/compliance/standard"
      title="New Standard Compliance"
    />
  );
}
