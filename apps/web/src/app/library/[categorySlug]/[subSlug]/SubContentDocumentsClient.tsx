'use client';

import { FileText, Calendar, Download } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';

import { Card, CardContent, Badge, Button, EmptyState, Pagination } from '@/components/ui';
import { getDocumentDownloadUrl, type Document } from '@/lib/api';

interface SubContentDocumentsClientProps {
  initialDocuments: Document[];
  totalPages: number;
  currentPage: number;
  categorySlug: string;
  subSlug: string;
  categoryName: string;
  subTitle: string;
  /** When set, breadcrumb uses this for the section link (e.g. /sustainability/certificate) instead of /library/categorySlug */
  sectionListHref?: string;
}

export function SubContentDocumentsClient({
  initialDocuments,
  totalPages,
  currentPage,
  categorySlug,
  subSlug,
  categoryName,
  subTitle,
  sectionListHref,
}: SubContentDocumentsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const formatDate = (dateString: string) => {
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
          {initialDocuments.length === 0 ? (
            <EmptyState
              type="no-data"
              title="No documents yet"
              description="Documents for this sub-content will appear here once they are published."
            />
          ) : (
            <>
              <p className="text-sm text-steel mb-6">
                Showing {initialDocuments.length} document{initialDocuments.length !== 1 && 's'}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {initialDocuments.map((doc) => (
                  <Card key={doc.id} hover className="h-full flex flex-col">
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <h3 className="font-heading text-base font-semibold text-charcoal mb-2 line-clamp-2">
                        {doc.attributes.title}
                      </h3>
                      {doc.attributes.description && (
                        <p className="text-sm text-steel mb-3 line-clamp-2 flex-1">
                          {doc.attributes.description.replace(/<[^>]*>/g, '')}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {doc.attributes.category?.data && (
                          <Badge variant="outline" className="text-xs">
                            {doc.attributes.category.data.attributes.name}
                          </Badge>
                        )}
                        {doc.attributes.tags?.data?.slice(0, 2).map((tag) => (
                          <Badge key={tag.id} variant="default" className="text-xs">
                            {tag.attributes.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-auto pt-3 border-t border-border-light space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-steel flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(doc.attributes.publishedAt)}
                          </span>
                          <div className="flex gap-2">
                            {doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.url && (() => {
                              const fileUrl = doc.attributes.currentVersion!.data!.attributes!.file!.data!.attributes!.url;
                              const fileName = doc.attributes.currentVersion!.data!.attributes!.file!.data!.attributes!.name;
                              return (
                                <a
                                  href={getDocumentDownloadUrl(fileUrl, fileName)}
                                  download={fileName}
                                  className="p-2 rounded-md hover:bg-light transition-colors text-steel hover:text-charcoal"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              );
                            })()}
                          </div>
                        </div>
                        {doc.attributes.externalLink && (
                          <a
                            href={doc.attributes.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-primary hover:underline"
                          >
                            Learn more →
                          </a>
                        )}
                      </div>
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
