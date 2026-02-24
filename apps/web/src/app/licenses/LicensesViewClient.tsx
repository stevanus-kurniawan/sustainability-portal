'use client';

import { ScrollText } from 'lucide-react';

import { EmptyState } from '@/components/ui';
import { LicenseCard, formatLicenseDate } from '@/components/section/LicenseCard';
import type { License } from '@/lib/api';

interface LicensesViewClientProps {
  activeLicenses: License[];
  expiredLicenses: License[];
}

export function LicensesViewClient({ activeLicenses, expiredLicenses }: LicensesViewClientProps) {
  const totalCount = activeLicenses.length + expiredLicenses.length;

  if (totalCount === 0) {
    return (
      <EmptyState
        type="no-data"
        title="No licenses available"
        description="Licenses will be displayed here once they are published."
      />
    );
  }

  return (
    <div className="space-y-12">
      <h2 className="font-heading text-h3 text-charcoal flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-warning" />
        Active Licenses
        <span className="text-sm font-normal text-steel">({activeLicenses.length})</span>
      </h2>
      {activeLicenses.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeLicenses.map((license) => (
            <LicenseCard key={license.id} license={license} formatDate={formatLicenseDate} />
          ))}
        </div>
      ) : (
        <p className="text-steel">No active licenses at this time.</p>
      )}

      {expiredLicenses.length > 0 && (
        <div>
          <h2 className="font-heading text-h3 text-charcoal mb-6 flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-steel" />
            Expired Licenses
            <span className="text-sm font-normal text-steel">({expiredLicenses.length})</span>
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
            {expiredLicenses.map((license) => (
              <LicenseCard key={license.id} license={license} formatDate={formatLicenseDate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
