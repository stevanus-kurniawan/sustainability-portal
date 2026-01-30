'use client';

import { DocumentForm } from '../../components/DocumentForm';

export default function AdminPoliciesNewPage() {
  return (
    <DocumentForm
      type="POLICY"
      backHref="/admin/policies"
      title="New Policy"
    />
  );
}
