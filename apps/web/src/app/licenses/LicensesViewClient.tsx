'use client';

import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';

import { EmptyState, ViewModeToggle, getStoredViewMode, type ViewMode } from '@/components/ui';
import { LicenseCard, formatLicenseDate } from '@/components/section/LicenseCard';
import type { License } from '@/lib/api';

interface LicensesViewClientProps {
  activeLicenses: License[];
  expiredLicenses: License[];
}

const VIEW_STORAGE_KEY = 'licenses-page';

export function LicensesViewClient({ activeLicenses, expiredLicenses }: LicensesViewClientProps) {
  const totalCount = activeLicenses.length + expiredLicenses.length;
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    setViewMode(getStoredViewMode(VIEW_STORAGE_KEY));
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-heading text-h3 text-charcoal flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-warning" />
          Active Licenses
          <span className="text-sm font-normal text-steel">({activeLicenses.length})</span>
        </h2>
        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          storageKey={VIEW_STORAGE_KEY}
          ariaLabel="Licenses view"
        />
      </div>

      {activeLicenses.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeLicenses.map((license) => (
              <LicenseCard key={license.id} license={license} formatDate={formatLicenseDate} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-light">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-light bg-lighter">
                  <th className="py-3 px-4 font-semibold text-charcoal">Name</th>
                  <th className="py-3 px-4 font-semibold text-charcoal">Authority</th>
                  <th className="py-3 px-4 font-semibold text-charcoal">License No.</th>
                  <th className="py-3 px-4 font-semibold text-charcoal">Issued</th>
                  <th className="py-3 px-4 font-semibold text-charcoal">Expires</th>
                  <th className="py-3 px-4 font-semibold text-charcoal">Status</th>
                  <th className="py-3 px-4 font-semibold text-charcoal text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeLicenses.map((license) => {
                  const fileUrl =
                    license.attributes.document?.data?.attributes?.currentVersion?.data?.attributes?.file
                      ?.data?.attributes?.url;
                  const externalLink = (license.attributes as { externalLink?: string | null }).externalLink;
                  const status = license.attributes.status;
                  const statusClass =
                    status === 'ACTIVE'
                      ? 'bg-success/10 text-success'
                      : status === 'EXPIRING'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-steel/10 text-steel';

                  return (
                    <tr
                      key={license.id}
                      className={`border-b border-border-light last:border-0 hover:bg-lighter/50 ${
                        status === 'EXPIRED' ? 'opacity-70' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-charcoal">{license.attributes.name}</td>
                      <td className="py-3 px-4 text-steel">
                        {license.attributes.authority ? license.attributes.authority : '—'}
                      </td>
                      <td className="py-3 px-4 text-steel">
                        {license.attributes.licenseNo ? `#${license.attributes.licenseNo}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-steel">
                        {license.attributes.issuedDate
                          ? formatLicenseDate(license.attributes.issuedDate)
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-steel">
                        {license.attributes.expiryDate
                          ? formatLicenseDate(license.attributes.expiryDate)
                          : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {fileUrl && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View
                          </a>
                        )}
                        {!fileUrl && externalLink && (
                          <a
                            href={externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Learn more
                          </a>
                        )}
                        {!fileUrl && !externalLink && '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
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
          {viewMode === 'grid' ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
              {expiredLicenses.map((license) => (
                <LicenseCard key={license.id} license={license} formatDate={formatLicenseDate} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border-light opacity-70">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-lighter">
                    <th className="py-3 px-4 font-semibold text-charcoal">Name</th>
                    <th className="py-3 px-4 font-semibold text-charcoal">Authority</th>
                    <th className="py-3 px-4 font-semibold text-charcoal">License No.</th>
                    <th className="py-3 px-4 font-semibold text-charcoal">Issued</th>
                    <th className="py-3 px-4 font-semibold text-charcoal">Expires</th>
                    <th className="py-3 px-4 font-semibold text-charcoal text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredLicenses.map((license) => {
                    const fileUrl =
                      license.attributes.document?.data?.attributes?.currentVersion?.data?.attributes?.file
                        ?.data?.attributes?.url;
                    const externalLink = (license.attributes as { externalLink?: string | null }).externalLink;

                    return (
                      <tr
                        key={license.id}
                        className="border-b border-border-light last:border-0 hover:bg-lighter/50"
                      >
                        <td className="py-3 px-4 font-medium text-charcoal">{license.attributes.name}</td>
                        <td className="py-3 px-4 text-steel">
                          {license.attributes.authority ? license.attributes.authority : '—'}
                        </td>
                        <td className="py-3 px-4 text-steel">
                          {license.attributes.licenseNo ? `#${license.attributes.licenseNo}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-steel">
                          {license.attributes.issuedDate
                            ? formatLicenseDate(license.attributes.issuedDate)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-steel">
                          {license.attributes.expiryDate
                            ? formatLicenseDate(license.attributes.expiryDate)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View
                            </a>
                          )}
                          {!fileUrl && externalLink && (
                            <a
                              href={externalLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Learn more
                            </a>
                          )}
                          {!fileUrl && !externalLink && '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
