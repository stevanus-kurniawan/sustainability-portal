import { Suspense } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState, CardSkeleton } from '@/components/ui';
import { getPolicies } from '@/lib/api';

import { PoliciesClient } from './PoliciesClient';

export const metadata = {
  title: 'Policies',
  description: 'Corporate sustainability policies and commitments',
};
export const dynamic = 'force-dynamic';

async function PoliciesContent() {
  const { data: policies } = await getPolicies({ pageSize: 50 });

  if (!policies || policies.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title="No policies available"
        description="Policies will be published here once they are available."
      />
    );
  }

  return <PoliciesClient policies={policies} />;
}

function PoliciesLoading() {
  return (
    <div className="grid gap-6">
      {[...Array(4)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <div>
      <PageHeader
        title="Policies"
        description="Access our corporate sustainability policies, environmental commitments, and social responsibility guidelines."
      />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<PoliciesLoading />}>
            <PoliciesContent />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
