import { Suspense } from 'react';
import { ScrollText, Calendar, Building2, FileCheck } from 'lucide-react';
import { getLicenses, type License } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, StatusBadge, EmptyState, CardSkeleton } from '@/components/ui';

export const metadata = {
  title: 'Licenses',
  description: 'Operating licenses and regulatory approvals',
};

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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const groupByStatus = (lics: License[]) => {
    const active = lics.filter(l => l.attributes.status === 'ACTIVE');
    const expiring = lics.filter(l => l.attributes.status === 'EXPIRING');
    const expired = lics.filter(l => l.attributes.status === 'EXPIRED');
    return { active, expiring, expired };
  };

  const { active, expiring, expired } = groupByStatus(licenses);
  const activeLics = [...expiring, ...active]; // Show expiring first

  return (
    <div className="space-y-12">
      {/* Active Licenses */}
      <div>
        <h2 className="font-heading text-h3 text-charcoal mb-6 flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-warning" />
          Active Licenses
          <span className="text-sm font-normal text-steel">({activeLics.length})</span>
        </h2>
        {activeLics.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeLics.map((license: License) => (
              <LicenseCard key={license.id} license={license} formatDate={formatDate} />
            ))}
          </div>
        ) : (
          <p className="text-steel">No active licenses at this time.</p>
        )}
      </div>

      {/* Expired Licenses */}
      {expired.length > 0 && (
        <div>
          <h2 className="font-heading text-h3 text-charcoal mb-6 flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-steel" />
            Expired Licenses
            <span className="text-sm font-normal text-steel">({expired.length})</span>
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
            {expired.map((license: License) => (
              <LicenseCard key={license.id} license={license} formatDate={formatDate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LicenseCard({
  license,
  formatDate,
}: {
  license: License;
  formatDate: (date: string) => string;
}) {
  return (
    <Card hover className="h-full">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
            <ScrollText className="h-6 w-6 text-warning" />
          </div>
          <StatusBadge status={license.attributes.status} />
        </div>

        <h3 className="font-heading text-lg font-semibold text-charcoal mb-2">
          {license.attributes.name}
        </h3>

        <div className="space-y-2 text-sm text-steel flex-1">
          {license.attributes.authority && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{license.attributes.authority}</span>
            </div>
          )}
          {license.attributes.licenseNo && (
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">#{license.attributes.licenseNo}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border-light">
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-steel">Issued</span>
              <p className="font-medium text-charcoal">
                {formatDate(license.attributes.issuedDate)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-steel">Expires</span>
              <p className="font-medium text-charcoal">
                {formatDate(license.attributes.expiryDate)}
              </p>
            </div>
          </div>
        </div>

        {license.attributes.document?.data?.attributes?.currentVersion?.data?.attributes?.file?.data && (
          <a
            href={license.attributes.document.data.attributes.currentVersion.data.attributes.file.data.attributes.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-sm mt-4 w-full justify-center"
          >
            View License
          </a>
        )}
      </CardContent>
    </Card>
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
        description="View our operating licenses, regulatory approvals, and government permits for sustainable operations."
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
