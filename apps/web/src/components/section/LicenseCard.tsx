import { ScrollText, Building2, FileCheck } from 'lucide-react';

import { Card, CardContent } from '@/components/ui';
import type { License } from '@/lib/api';

export function formatLicenseDate(dateString: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface LicenseCardProps {
  license: License;
  formatDate?: (date: string) => string;
}

export function LicenseCard({ license, formatDate = formatLicenseDate }: LicenseCardProps) {
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
