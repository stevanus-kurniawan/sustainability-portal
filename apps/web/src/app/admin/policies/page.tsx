'use client';

import Link from 'next/link';
import { DocumentListPage } from '../components/DocumentListPage';

export default function AdminPoliciesPage() {
  return (
    <DocumentListPage
      title="Policies"
      description="Manage policy documents."
      type="POLICY"
      createHref="/admin/policies/new"
      editHref={(id) => `/admin/policies/${id}`}
    />
  );
}
