'use client';

import { Award, Building2, FileCheck, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import { Card, CardContent, EmptyState, Input, Pagination, ViewModeToggle, getStoredViewMode, type ViewMode } from '@/components/ui';
import type { Certification } from '@/lib/api';

function filterCertifications(list: Certification[], query: string): Certification[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => {
    const name = (c.attributes.name ?? '').toLowerCase();
    const issuer = (c.attributes.issuer ?? '').toLowerCase();
    const certNo = (c.attributes.certificateNo ?? '').toLowerCase();
    return name.includes(q) || issuer.includes(q) || certNo.includes(q);
  });
}

const VIEW_STORAGE_KEY = 'certifications-sub';

interface SubContentCertificationsClientProps {
  initialCertifications: Certification[];
  totalPages: number;
  currentPage: number;
  categorySlug: string;
  subSlug: string;
  categoryName: string;
  subTitle: string;
  sectionListHref: string;
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CertificationCard({ certification }: { certification: Certification }) {
  const docData = certification.attributes?.document?.data ?? null;
  const fileUrl =
    docData?.attributes?.currentVersion?.data?.attributes?.file?.data?.attributes?.url ?? undefined;
  const externalLink = (certification.attributes as { externalLink?: string | null }).externalLink ?? null;

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

export function SubContentCertificationsClient({
  initialCertifications,
  totalPages,
  currentPage,
  categorySlug,
  subSlug,
  categoryName,
  subTitle,
  sectionListHref,
}: SubContentCertificationsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setViewMode(getStoredViewMode(VIEW_STORAGE_KEY));
  }, []);

  const filteredCertifications = useMemo(
    () => filterCertifications(initialCertifications, searchQuery),
    [initialCertifications, searchQuery],
  );

  const onPageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) params.delete('page');
      else params.set('page', String(page));
      startTransition(() => router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`));
    },
    [pathname, router, searchParams],
  );

  return (
    <>
      <nav className="text-sm text-steel mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-charcoal">
          Portal
        </Link>
        <span>/</span>
        <Link href={sectionListHref} className="hover:text-charcoal">
          {categoryName}
        </Link>
        <span>/</span>
        <span className="text-charcoal font-medium">{subTitle}</span>
      </nav>

      <section className={isPending ? 'opacity-50' : ''}>
        {initialCertifications.length === 0 ? (
          <EmptyState
            type="no-data"
            title="No certifications yet"
            description="Certifications for this sub-content will appear here once they are added."
          />
        ) : (
          <>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel pointer-events-none" />
                  <Input
                    type="search"
                    placeholder="Search by name, issuer, certificate no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full"
                    aria-label="Search certifications"
                  />
                </div>
                <ViewModeToggle
                  value={viewMode}
                  onChange={setViewMode}
                  storageKey={VIEW_STORAGE_KEY}
                  ariaLabel="Certifications view"
                />
              </div>
              <p className="text-sm text-steel">
                {searchQuery.trim()
                  ? `Showing ${filteredCertifications.length} of ${initialCertifications.length} certification${initialCertifications.length !== 1 ? 's' : ''}`
                  : `Showing ${initialCertifications.length} certification${initialCertifications.length !== 1 && 's'}`}
              </p>
            </div>
            {filteredCertifications.length === 0 ? (
              <EmptyState
                type="no-data"
                title="No matching certifications"
                description={searchQuery.trim() ? 'Try a different search term.' : undefined}
              />
            ) : viewMode === 'grid' ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCertifications.map((cert) => (
                  <CertificationCard key={cert.id} certification={cert} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border-light">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-light bg-lighter">
                      <th className="py-3 px-4 font-semibold text-charcoal">Name</th>
                      <th className="py-3 px-4 font-semibold text-charcoal">Issuer</th>
                      <th className="py-3 px-4 font-semibold text-charcoal">Certificate No.</th>
                      <th className="py-3 px-4 font-semibold text-charcoal">Issued</th>
                      <th className="py-3 px-4 font-semibold text-charcoal">Expires</th>
                      <th className="py-3 px-4 font-semibold text-charcoal text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCertifications.map((cert) => {
                      const fileUrl =
                        cert.attributes.document?.data?.attributes?.currentVersion?.data?.attributes
                          ?.file?.data?.attributes?.url;
                      const externalLink = (cert.attributes as { externalLink?: string | null }).externalLink;
                      return (
                        <tr key={cert.id} className="border-b border-border-light last:border-0 hover:bg-lighter/50">
                          <td className="py-3 px-4 font-medium text-charcoal">{cert.attributes.name}</td>
                          <td className="py-3 px-4 text-steel">{cert.attributes.issuer || '—'}</td>
                          <td className="py-3 px-4 text-steel">
                            {cert.attributes.certificateNo ? `#${cert.attributes.certificateNo}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-steel">
                            {cert.attributes.issuedDate ? formatDate(cert.attributes.issuedDate) : '—'}
                          </td>
                          <td className="py-3 px-4 text-steel">
                            {cert.attributes.expiryDate ? formatDate(cert.attributes.expiryDate) : '—'}
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
            {filteredCertifications.length > 0 && totalPages > 1 && (
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
      </section>
    </>
  );
}
