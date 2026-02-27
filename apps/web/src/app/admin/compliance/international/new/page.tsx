'use client';

import { DocumentForm } from '../../../components/DocumentForm';

export default function AdminComplianceInternationalNewPage() {
  return (
    <DocumentForm
      type="GENERAL"
      categorySlug="international"
      backHref="/admin/compliance/international"
      title="New International Compliance"
    />
  );
}
