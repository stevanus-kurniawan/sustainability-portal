'use client';

import { DocumentListPage } from '../components/DocumentListPage';

export default function AdminPoliciesPage() {
  return (
    <DocumentListPage
      title="Policies"
      description="Manage v2 policy records."
      type="POLICY"
      contentVersion="V2"
      createHref="/admin/policies/new"
      editHref={(id) => `/admin/policies/${id}`}
      viewModeStorageKey="policy-v2"
    />
  );
}
