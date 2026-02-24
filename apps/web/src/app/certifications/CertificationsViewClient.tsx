'use client';

import { Award, Building2, FileCheck } from 'lucide-react';

import { Card, CardContent, EmptyState } from '@/components/ui';
import type { Certification } from '@/lib/api';

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CertificationCard({
  certification,
}: {
  certification: Certification;
}) {
  const fileUrl =
    certification.attributes.document?.data?.attributes?.currentVersion?.data?.attributes?.file
      ?.data?.attributes?.url;
  const externalLink = (certification.attributes as { externalLink?: string | null }).externalLink;
  const hasIssued =
    certification.attributes.issuedDate &&
    !Number.isNaN(new Date(certification.attributes.issuedDate).getTime());
  const hasExpiry =
    certification.attributes.expiryDate &&
    !Number.isNaN(new Date(certification.attributes.expiryDate).getTime());

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
        {(hasIssued || hasExpiry) && (
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
        )}
        {(fileUrl || externalLink) && (
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
        )}
      </CardContent>
    </Card>
  );
}

interface CertificationsViewClientProps {
  certifications: Certification[];
}

export function CertificationsViewClient({ certifications }: CertificationsViewClientProps) {
  if (certifications.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title="No certifications available"
        description="Certifications will be displayed here once they are published."
      />
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="font-heading text-h3 text-charcoal flex items-center gap-2">
        <Award className="h-6 w-6 text-success" />
        Active Certifications
        <span className="text-sm font-normal text-steel">({certifications.length})</span>
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {certifications.map((cert) => (
          <CertificationCard key={cert.id} certification={cert} />
        ))}
      </div>
    </div>
  );
}
