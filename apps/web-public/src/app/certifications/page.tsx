import { Suspense } from 'react';
import { Award, Calendar, Building2, FileCheck } from 'lucide-react';
import { getCertifications, type Certification } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, StatusBadge, EmptyState, CardSkeleton } from '@/components/ui';

export const metadata = {
  title: 'Certifications',
  description: 'Sustainability certifications and standards compliance',
};

async function CertificationsList() {
  const { data: certifications } = await getCertifications({ pageSize: 50 });

  if (!certifications || certifications.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title="No certifications available"
        description="Certifications will be displayed here once they are published."
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

  const groupByStatus = (certs: Certification[]) => {
    const active = certs.filter(c => c.attributes.status === 'ACTIVE');
    const expiring = certs.filter(c => c.attributes.status === 'EXPIRING');
    const expired = certs.filter(c => c.attributes.status === 'EXPIRED');
    return { active, expiring, expired };
  };

  const { active, expiring, expired } = groupByStatus(certifications);
  const activeCerts = [...expiring, ...active]; // Show expiring first in active section

  return (
    <div className="space-y-12">
      {/* Active Certifications */}
      <div>
        <h2 className="font-heading text-h3 text-charcoal mb-6 flex items-center gap-2">
          <Award className="h-6 w-6 text-success" />
          Active Certifications
          <span className="text-sm font-normal text-steel">({activeCerts.length})</span>
        </h2>
        {activeCerts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeCerts.map((cert: Certification) => (
              <CertificationCard key={cert.id} certification={cert} formatDate={formatDate} />
            ))}
          </div>
        ) : (
          <p className="text-steel">No active certifications at this time.</p>
        )}
      </div>

      {/* Expired Certifications */}
      {expired.length > 0 && (
        <div>
          <h2 className="font-heading text-h3 text-charcoal mb-6 flex items-center gap-2">
            <Award className="h-6 w-6 text-steel" />
            Expired Certifications
            <span className="text-sm font-normal text-steel">({expired.length})</span>
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
            {expired.map((cert: Certification) => (
              <CertificationCard key={cert.id} certification={cert} formatDate={formatDate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CertificationCard({
  certification,
  formatDate,
}: {
  certification: Certification;
  formatDate: (date: string) => string;
}) {
  return (
    <Card hover className="h-full">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
            <Award className="h-6 w-6 text-success" />
          </div>
          <StatusBadge status={certification.attributes.status} />
        </div>

        <h3 className="font-heading text-lg font-semibold text-charcoal mb-2">
          {certification.attributes.name}
        </h3>

        <div className="space-y-2 text-sm text-steel flex-1">
          {certification.attributes.issuer && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{certification.attributes.issuer}</span>
            </div>
          )}
          {certification.attributes.certificateNo && (
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">#{certification.attributes.certificateNo}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border-light">
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-steel">Issued</span>
              <p className="font-medium text-charcoal">
                {formatDate(certification.attributes.issuedDate)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-steel">Expires</span>
              <p className="font-medium text-charcoal">
                {formatDate(certification.attributes.expiryDate)}
              </p>
            </div>
          </div>
        </div>

        {certification.attributes.document?.data?.attributes?.currentVersion?.data?.attributes?.file?.data && (
          <a
            href={certification.attributes.document.data.attributes.currentVersion.data.attributes.file.data.attributes.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-sm mt-4 w-full justify-center"
          >
            View Certificate
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function CertificationsLoading() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function CertificationsPage() {
  return (
    <div>
      <PageHeader
        title="Certifications"
        description="View our sustainability certifications, environmental standards compliance, and third-party verifications."
      />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<CertificationsLoading />}>
            <CertificationsList />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
