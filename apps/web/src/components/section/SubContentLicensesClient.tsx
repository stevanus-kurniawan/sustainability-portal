'use client';

import { ScrollText, Building2, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';

import { Card, CardContent, EmptyState, Pagination } from '@/components/ui';
import type { License } from '@/lib/api';

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
              <p className="text-sm text-steel mb-6">
                Showing {initialLicenses.length} license{initialLicenses.length !== 1 && 's'}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {initialLicenses.map((license) => (
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
              {totalPages > 1 && (
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
