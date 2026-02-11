import { ScrollText } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState, CardSkeleton } from '@/components/ui';
import { LicenseCard, formatLicenseDate } from '@/components/section/LicenseCard';
import { getLicenses, type License } from '@/lib/api';

export const metadata = {
  title: 'Licenses',
  description: 'Operating licenses and regulatory approvals',
};
export const dynamic = 'force-dynamic';

async function LicensesList() {
  const { data: licenses } = await getLicenses({ pageSize: 50 });

  if (!licenses || licenses.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title="No licenses available"
        description="Licenses will be displayed here once they are published."
      />
    );
  }

  const groupByStatus = (lics: License[]) => {
    const active = lics.filter((l) => l.attributes.status === 'ACTIVE');
    const expiring = lics.filter((l) => l.attributes.status === 'EXPIRING');
    const expired = lics.filter((l) => l.attributes.status === 'EXPIRED');
    return { active, expiring, expired };
  };

  const { active, expiring, expired } = groupByStatus(licenses);
  const activeLics = [...expiring, ...active];

  return (
    <div className="space-y-12">
      <div>
        <h2 className="font-heading text-h3 text-charcoal mb-6 flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-warning" />
          Active Licenses
          <span className="text-sm font-normal text-steel">({activeLics.length})</span>
        </h2>
        {activeLics.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeLics.map((license: License) => (
              <LicenseCard key={license.id} license={license} formatDate={formatLicenseDate} />
            ))}
          </div>
        ) : (
          <p className="text-steel">No active licenses at this time.</p>
        )}
      </div>

      {expired.length > 0 && (
        <div>
          <h2 className="font-heading text-h3 text-charcoal mb-6 flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-steel" />
            Expired Licenses
            <span className="text-sm font-normal text-steel">({expired.length})</span>
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
            {expired.map((license: License) => (
              <LicenseCard key={license.id} license={license} formatDate={formatLicenseDate} />
            ))}
          </div>
        </div>
      )}
    </div>
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
