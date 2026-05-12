'use client';

import { DocumentForm } from '../../../components/DocumentForm';

export default function AdminSustainabilityReportsNewPage() {
  return (
    <DocumentForm
      type="GENERAL"
      categorySlug="sustainability-report"
      hideCategoryPicker
      backHref="/admin/sustainability/reports"
      title="New Sustainability Report"
    />
  );
}
