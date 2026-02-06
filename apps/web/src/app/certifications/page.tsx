import { Award, Building2, FileCheck } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, EmptyState, CardSkeleton } from '@/components/ui';
import { getCertifications, type Certification } from '@/lib/api';

export const metadata = {
  title: 'Certifications',
  description: 'Sustainability certifications and standards compliance',
};
export const dynamic = 'force-dynamic';

async function CertificationsList() {
  const { data: certifications } = await getCertifications({ pageSize: 50 });

  // Only show non-expired certifications on the portal
  const visibleCertifications =
    certifications?.filter((c) => c.attributes.status !== 'EXPIRED') ?? [];

  if (visibleCertifications.length === 0) {
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
    const active = certs.filter((c) => c.attributes.status === 'ACTIVE');
    const expiring = certs.filter((c) => c.attributes.status === 'EXPIRING');
    return { active, expiring };
  };

  const { active, expiring } = groupByStatus(visibleCertifications);
  const activeCerts = [...expiring, ...active];

  return (
    <div className="space-y-12">
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
        {(() => {
          const hasIssued =
            certification.attributes.issuedDate &&
            !Number.isNaN(new Date(certification.attributes.issuedDate).getTime());
          const hasExpiry =
            certification.attributes.expiryDate &&
            !Number.isNaN(new Date(certification.attributes.expiryDate).getTime());
          if (!hasIssued && !hasExpiry) return null;
          return (
            <div className="mt-4 pt-4 border-t border-border-light">
              <div className="flex justify-between text-sm">
                {hasIssued && (
                  <div>
                    <span className="text-steel">Issued</span>
                    <p className="font-medium text-charcoal">
                      {formatDate(certification.attributes.issuedDate)}
                    </p>
                  </div>
                )}
                {hasExpiry && (
                  <div className={hasIssued ? 'text-right' : ''}>
                    <span className="text-steel">Expires</span>
                    <p className="font-medium text-charcoal">
                      {formatDate(certification.attributes.expiryDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {(() => {
          const fileUrl =
            certification.attributes.document?.data?.attributes?.currentVersion?.data?.attributes
              ?.file?.data?.attributes?.url;
          const externalLink = (certification.attributes as { externalLink?: string | null })
            .externalLink;
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
                  View Certificate
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
        description="Our sustainability certifications, environmental and social standards compliance, and third-party verifications. This page lists active and expiring certifications with issuers, certificate numbers, validity dates, and links to view or download certificates where available."
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
