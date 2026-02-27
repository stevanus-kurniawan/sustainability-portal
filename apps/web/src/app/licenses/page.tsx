import { Suspense } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { CardSkeleton } from '@/components/ui';
import { getLicenses, type License } from '@/lib/api';

import { LicensesViewClient } from './LicensesViewClient';

export const metadata = {
  title: 'Licenses',
  description: 'Operating licenses and regulatory approvals',
};
export const dynamic = 'force-dynamic';

function groupByStatus(lics: License[]) {
  const active = lics.filter((l) => l.attributes.status === 'ACTIVE');
  const expiring = lics.filter((l) => l.attributes.status === 'EXPIRING');
  const expired = lics.filter((l) => l.attributes.status === 'EXPIRED');
  return { active, expiring, expired };
}

async function LicensesList() {
  const { data: licenses } = await getLicenses({ pageSize: 50 });

  if (!licenses || licenses.length === 0) {
    return (
      <LicensesViewClient activeLicenses={[]} expiredLicenses={[]} />
    );
  }

  const { active, expiring, expired } = groupByStatus(licenses);
  const activeLics = [...expiring, ...active];

  return (
    <LicensesViewClient activeLicenses={activeLics} expiredLicenses={expired} />
  );
}

function LicensesLoading() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function LicensesPage() {
  return (
    <div>
      <PageHeader
        title="Licenses"
        description="Operating licenses, regulatory approvals, and government permits that support our sustainable operations. This page lists current and past licenses with their status, validity periods, and links to view or download supporting documents where available."
      />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<LicensesLoading />}>
            <LicensesList />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
