'use client';

import { DocumentForm } from '../../components/DocumentForm';

export default function AdminPoliciesNewPage() {
  return (
    <DocumentForm
      type="POLICY"
      contentVersion="V2"
      backHref="/admin/policies"
      title="New Policy"
    />
  );
}
