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

interface PoliciesPageProps {
  searchParams?: Promise<{ search?: string }>;
}

async function PoliciesContent({ searchParams }: { searchParams?: Promise<{ search?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const search = params.search?.trim() ?? '';
  const { data: policies } = await getPolicies({ pageSize: 50, search: search || undefined });

  if (!policies || policies.length === 0) {
    return (
      <PoliciesClient
        policies={[]}
        currentSearch={search}
        emptyTitle={search ? 'No policies match your search' : 'No policies available'}
        emptyDescription={search ? 'Try a different search term.' : 'Policies will be published here once they are available.'}
      />
    );
  }

  return (
    <PoliciesClient
      policies={policies}
      currentSearch={search}
      emptyTitle={undefined}
      emptyDescription={undefined}
    />
  );
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

export default function PoliciesPage({ searchParams }: PoliciesPageProps) {
  return (
    <div>
      <PageHeader
        title="Policies"
        description="Access our corporate sustainability policies, environmental commitments, and social responsibility guidelines."
      />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<PoliciesLoading />}>
            <PoliciesContent searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
