'use client';

import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { EmptyState, Input, ViewModeToggle, getStoredViewMode, type ViewMode } from '@/components/ui';
import { LicenseCard, formatLicenseDate } from '@/components/section/LicenseCard';
import type { License } from '@/lib/api';

function filterLicenses(list: License[], query: string): License[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((l) => {
    const name = (l.attributes.name ?? '').toLowerCase();
    const authority = (l.attributes.authority ?? '').toLowerCase();
    const licenseNo = (l.attributes.licenseNo ?? '').toLowerCase();
    const status = (l.attributes.status ?? '').toLowerCase();
    return name.includes(q) || authority.includes(q) || licenseNo.includes(q) || status.includes(q);
  });
}

const VIEW_STORAGE_KEY = 'licenses-section';

interface ComplianceLicensesSectionClientProps {
  config: { title: string; description: string; bannerImage: string };
  licenses: License[];
}

export function ComplianceLicensesSectionClient({ config, licenses }: ComplianceLicensesSectionClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setViewMode(getStoredViewMode(VIEW_STORAGE_KEY));
  }, []);

  const filteredLicenses = useMemo(
    () => filterLicenses(licenses, searchQuery),
    [licenses, searchQuery],
  );

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        bannerImage={config.bannerImage}
      />
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {!licenses || licenses.length === 0 ? (
            <EmptyState
              type="no-data"
              title="No licenses available"
              description="Licenses will be displayed here once they are published."
            />
          ) : (
            <>
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel pointer-events-none" />
                    <Input
                      type="search"
                      placeholder="Search by name, authority, license no..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full"
                      aria-label="Search licenses"
                    />
                  </div>
                  <ViewModeToggle
                    value={viewMode}
                    onChange={setViewMode}
                    storageKey={VIEW_STORAGE_KEY}
                    ariaLabel="Licenses view"
                  />
                </div>
                <p className="text-sm text-steel">
                  {searchQuery.trim()
                    ? `Showing ${filteredLicenses.length} of ${licenses.length} license${licenses.length !== 1 ? 's' : ''}`
                    : `Showing ${licenses.length} license${licenses.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              {filteredLicenses.length === 0 ? (
                <EmptyState
                  type="no-data"
                  title="No matching licenses"
                  description={searchQuery.trim() ? 'Try a different search term.' : undefined}
                />
              ) : viewMode === 'grid' ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredLicenses.map((license) => (
                    <LicenseCard
                      key={license.id}
                      license={license}
                      formatDate={formatLicenseDate}
                    />
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
                      {filteredLicenses.map((license) => {
                        const fileUrl =
                          license.attributes.document?.data?.attributes?.currentVersion?.data
                            ?.attributes?.file?.data?.attributes?.url;
                        const externalLink = (license.attributes as { externalLink?: string | null }).externalLink;
                        const status = license.attributes.status;
                        const statusVariant =
                          status === 'ACTIVE' ? 'success' : status === 'EXPIRING' ? 'warning' : 'secondary';
                        return (
                          <tr
                            key={license.id}
                            className={`border-b border-border-light last:border-0 hover:bg-lighter/50 ${status === 'EXPIRED' ? 'opacity-70' : ''}`}
                          >
                            <td className="py-3 px-4 font-medium text-charcoal">{license.attributes.name}</td>
                            <td className="py-3 px-4 text-steel">{license.attributes.authority || '—'}</td>
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
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  statusVariant === 'success'
                                    ? 'bg-success/10 text-success'
                                    : statusVariant === 'warning'
                                      ? 'bg-warning/10 text-warning'
                                      : 'bg-steel/10 text-steel'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {fileUrl && (
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  View
                                </a>
                              )}
                              {!fileUrl && externalLink && (
                                <a href={externalLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
            </>
          )}
        </div>
      </section>
    </div>
  );
}
