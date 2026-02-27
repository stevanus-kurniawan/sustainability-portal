'use client';

import { DocumentForm } from '../../../components/DocumentForm';

export default function AdminComplianceNationalNewPage() {
  return (
    <DocumentForm
      type="GENERAL"
      categorySlug="national"
      backHref="/admin/compliance/national"
      title="New National Compliance"
    />
  );
}
