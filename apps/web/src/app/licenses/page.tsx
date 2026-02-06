import { ScrollText, Building2, FileCheck } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, EmptyState, CardSkeleton } from '@/components/ui';
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
              <LicenseCard key={license.id} license={license} formatDate={formatDate} />
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
        {(() => {
          const hasIssued =
            license.attributes.issuedDate &&
            !Number.isNaN(new Date(license.attributes.issuedDate).getTime());
          const hasExpiry =
            license.attributes.expiryDate &&
            !Number.isNaN(new Date(license.attributes.expiryDate).getTime());
          if (!hasIssued && !hasExpiry) return null;
          return (
            <div className="mt-4 pt-4 border-t border-border-light">
              <div className="flex justify-between text-sm">
                {hasIssued && (
                  <div>
                    <span className="text-steel">Issued</span>
                    <p className="font-medium text-charcoal">
                      {formatDate(license.attributes.issuedDate)}
                    </p>
                  </div>
                )}
                {hasExpiry && (
                  <div className={hasIssued ? 'text-right' : ''}>
                    <span className="text-steel">Expires</span>
                    <p className="font-medium text-charcoal">
                      {formatDate(license.attributes.expiryDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {(() => {
          const fileUrl =
            license.attributes.document?.data?.attributes?.currentVersion?.data?.attributes?.file
              ?.data?.attributes?.url;
          const externalLink = (license.attributes as { externalLink?: string | null }).externalLink;
          if (!fileUrl && !externalLink) return null;
          return (
            <div className="mt-4 space-y-2">
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline text-sm w-full justify-center"
                >
                  View License
                </a>
              )}
              {externalLink && (
                <a
                  href={externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-primary hover:underline text-center"
                >
                  Learn more →
                </a>
              )}
            </div>
          );
        })()}
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
