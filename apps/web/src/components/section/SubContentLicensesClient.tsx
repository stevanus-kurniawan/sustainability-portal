'use client';

import { ScrollText, Building2, FileCheck, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import { Card, CardContent, EmptyState, Input, Pagination, ViewModeToggle, getStoredViewMode, type ViewMode } from '@/components/ui';
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

const VIEW_STORAGE_KEY = 'licenses-sub';

interface SubContentLicensesClientProps {
  initialLicenses: License[];
  totalPages: number;
  currentPage: number;
  categorySlug: string;
  subSlug: string;
  categoryName: string;
  subTitle: string;
  /** When set, breadcrumb uses this for the section link */
  sectionListHref?: string;
}

export function SubContentLicensesClient({
  initialLicenses,
  totalPages,
  currentPage,
  categorySlug,
  subSlug,
  categoryName,
  subTitle,
  sectionListHref,
}: SubContentLicensesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setViewMode(getStoredViewMode(VIEW_STORAGE_KEY));
  }, []);

  const filteredLicenses = useMemo(
    () => filterLicenses(initialLicenses, searchQuery),
    [initialLicenses, searchQuery],
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onPageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) params.delete('page');
      else params.set('page', String(page));
      startTransition(() => router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`));
    },
    [pathname, router, searchParams]
  );

  const sectionLinkHref = sectionListHref ?? `/library/${categorySlug}`;
  const rootLabel = sectionListHref ? 'Portal' : 'Library';
  const rootHref = sectionListHref ? '/' : '/library';

  return (
    <>
      <nav className="text-sm text-steel mb-6 flex items-center gap-2">
        <Link href={rootHref} className="hover:text-charcoal">
          {rootLabel}
        </Link>
        <span>/</span>
        <Link href={sectionLinkHref} className="hover:text-charcoal">
          {categoryName}
        </Link>
        <span>/</span>
        <span className="text-charcoal font-medium">{subTitle}</span>
      </nav>

      <section className={isPending ? 'opacity-50' : ''}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {initialLicenses.length === 0 ? (
            <EmptyState
              type="no-data"
              title="No licenses yet"
              description="Licenses for this sub-content will appear here once they are created."
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
                    ? `Showing ${filteredLicenses.length} of ${initialLicenses.length} license${initialLicenses.length !== 1 ? 's' : ''}`
                    : `Showing ${initialLicenses.length} license${initialLicenses.length !== 1 ? 's' : ''}`}
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
                    <Card key={license.id} hover className="h-full">
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
                            license.attributes.document?.data?.attributes?.currentVersion?.data
                              ?.attributes?.file?.data?.attributes?.url;
                          const externalLink = (license.attributes as { externalLink?: string | null })
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
                              {license.attributes.issuedDate ? formatDate(license.attributes.issuedDate) : '—'}
                            </td>
                            <td className="py-3 px-4 text-steel">
                              {license.attributes.expiryDate ? formatDate(license.attributes.expiryDate) : '—'}
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
              {filteredLicenses.length > 0 && totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
