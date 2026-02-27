'use client';

import { FileText, Calendar, Download, ClipboardList, FileBarChart, Search, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useTransition, useState } from 'react';

import { Card, CardContent, Badge, EmptyState, Input, Pagination, ViewModeToggle, getStoredViewMode, type ViewMode } from '@/components/ui';
import type { Document } from '@/lib/api';
import { getDocumentDownloadUrl } from '@/lib/api';

function getDocumentIcon(sectionPath: string): LucideIcon {
  if (sectionPath.endsWith('/sop')) return ClipboardList;
  if (sectionPath.endsWith('/sustainability-report')) return FileBarChart;
  return FileText;
}

/** Table column set: full (SOP/Policy style) or simple (Title, Published date, Action) per existing page. */
export type SectionTableColumns = 'full' | 'simple';

interface SectionDocumentsClientProps {
  initialDocuments: Document[];
  totalPages: number;
  currentPage: number;
  sectionPath: string;
  categoryName: string;
  /** When set, shows table/grid toggle. */
  viewModeStorageKey?: string;
  /** Default view when no stored preference. Defaults to 'table'. */
  defaultViewMode?: ViewMode;
  /** When true, always use defaultViewMode on load (do not restore from localStorage). Use for sections that must default to table. */
  preferDefaultViewMode?: boolean;
  /** Table columns: 'full' = Title, Code, Type, Version, Effective Date, Action; 'simple' = Title, Published date, Action. Default 'simple'. */
  tableColumns?: SectionTableColumns;
}

export function SectionDocumentsClient({
  initialDocuments,
  totalPages,
  currentPage,
  sectionPath,
  categoryName,
  viewModeStorageKey,
  defaultViewMode = 'table',
  preferDefaultViewMode = false,
  tableColumns = 'simple',
}: SectionDocumentsClientProps) {
  const DocumentIcon = getDocumentIcon(sectionPath);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);

  const pathLower = sectionPath?.toLowerCase() ?? '';
  const isSopSection = pathLower.endsWith('/sop');
  const isFormSection = pathLower.endsWith('/form') || pathLower.endsWith('/forms');
  const effectiveStorageKey =
    viewModeStorageKey ??
    (isSopSection ? 'procedure-sop-public' : isFormSection ? 'procedure-form-public' : undefined);

  useEffect(() => {
    if (effectiveStorageKey && !preferDefaultViewMode) setViewMode(getStoredViewMode(effectiveStorageKey));
  }, [effectiveStorageKey, preferDefaultViewMode]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
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

  const sectionHref = `/${sectionPath}`;
  const showTableView = Boolean(effectiveStorageKey);
  const showSearch = Boolean(effectiveStorageKey);
  const currentSearch = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const onSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchInput.trim();
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set('search', q);
      else params.delete('search');
      params.set('page', '1');
      startTransition(() => router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`));
    },
    [pathname, router, searchInput, searchParams, startTransition]
  );

  return (
    <>
      <nav className="text-sm text-steel mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-charcoal">
          Portal
        </Link>
        <span>/</span>
        <Link href={sectionHref} className="hover:text-charcoal">
          {categoryName}
        </Link>
      </nav>

      <section className={isPending ? 'opacity-50' : ''}>
        {showSearch && (
          <form onSubmit={onSearchSubmit} className="mb-6 flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative w-full max-w-sm sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel pointer-events-none" />
              <Input
                type="search"
                placeholder="Search documents..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 w-full"
                aria-label="Search documents"
              />
            </div>
            {showTableView && (
              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                storageKey={effectiveStorageKey!}
                ariaLabel={`${categoryName} view`}
              />
            )}
          </form>
        )}

        {initialDocuments.length === 0 ? (
          <EmptyState
            type="no-data"
            title={currentSearch ? 'No documents match your search' : 'No documents yet'}
            description={currentSearch ? 'Try a different search term.' : 'Documents for this section will appear here once they are published.'}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <p className="text-sm text-steel">
                Showing {initialDocuments.length} document{initialDocuments.length !== 1 ? 's' : ''}
              </p>
              {showTableView && !showSearch && (
                <ViewModeToggle
                  value={viewMode}
                  onChange={setViewMode}
                  storageKey={effectiveStorageKey!}
                  ariaLabel={`${categoryName} view`}
                />
              )}
            </div>

            {showTableView && viewMode === 'table' ? (
              tableColumns === 'full' ? (
                <div className="overflow-x-auto rounded-lg border border-border-light">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border-light bg-lighter">
                        <th className="py-3 px-4 font-semibold text-charcoal">Title</th>
                        <th className="py-3 px-4 font-semibold text-charcoal">Code</th>
                        <th className="py-3 px-4 font-semibold text-charcoal">Type</th>
                        <th className="py-3 px-4 font-semibold text-charcoal">Version</th>
                        <th className="py-3 px-4 font-semibold text-charcoal">Effective Date</th>
                        <th className="py-3 px-4 font-semibold text-charcoal text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {initialDocuments.map((doc) => {
                        const attrs = doc.attributes as typeof doc.attributes & {
                          code?: string | null;
                          documentType?: string | null;
                          versionLabel?: string | null;
                          effectiveDate?: string | null;
                        };
                        const currentVersion = (doc.attributes.currentVersion as {
                          data?: { attributes?: { versionNo?: number | null; validFrom?: string | null } } | null;
                        } | null)?.data;
                        const versionNo = currentVersion?.attributes?.versionNo ?? null;
                        const effectiveFrom = currentVersion?.attributes?.validFrom ?? null;
                        const fileUrl = currentVersion?.attributes
                          ? (currentVersion as { attributes?: { file?: { data?: { attributes?: { url?: string; name?: string } } } } }).attributes?.file?.data?.attributes?.url ?? null
                          : null;
                        const fileName = currentVersion?.attributes
                          ? (currentVersion as { attributes?: { file?: { data?: { attributes?: { name?: string } } } } }).attributes?.file?.data?.attributes?.name ?? null
                          : null;
                        const externalLink = attrs.externalLink ?? null;
                        const displayCode = attrs.code ?? '—';
                        const displayType = attrs.documentType ?? doc.attributes.type ?? '—';
                        const displayVersion = attrs.versionLabel ?? (versionNo != null ? String(versionNo) : '—');
                        const displayEffectiveDate = formatDate(attrs.effectiveDate ?? effectiveFrom ?? null);
                        return (
                          <tr key={doc.id} className="border-b border-border-light last:border-0 hover:bg-lighter/50">
                            <td className="py-3 px-4 font-medium text-charcoal">
                              {attrs.title || '—'}
                              {doc.attributes.category?.data && (
                                <span className="ml-2 inline-flex">
                                  <Badge variant="outline">{doc.attributes.category.data.attributes.name}</Badge>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-steel">{displayCode}</td>
                            <td className="py-3 px-4 text-steel">{displayType}</td>
                            <td className="py-3 px-4 text-steel">{displayVersion}</td>
                            <td className="py-3 px-4 text-steel">{displayEffectiveDate}</td>
                            <td className="py-3 px-4 text-right">
                              {fileUrl && (
                                <a
                                  href={getDocumentDownloadUrl(fileUrl, fileName)}
                                  download={fileName ?? undefined}
                                  className="text-primary hover:underline mr-3"
                                >
                                  Download
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
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border-light">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border-light bg-lighter">
                        <th className="py-3 px-4 font-semibold text-charcoal">Title</th>
                        <th className="py-3 px-4 font-semibold text-charcoal">Published</th>
                        <th className="py-3 px-4 font-semibold text-charcoal text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {initialDocuments.map((doc) => {
                        const currentVersion = (doc.attributes.currentVersion as {
                          data?: { attributes?: { file?: { data?: { attributes?: { url?: string; name?: string } } } } };
                        } | null)?.data;
                        const fileUrl = currentVersion?.attributes?.file?.data?.attributes?.url ?? null;
                        const fileName = currentVersion?.attributes?.file?.data?.attributes?.name ?? null;
                        const externalLink = doc.attributes.externalLink ?? null;
                        return (
                          <tr key={doc.id} className="border-b border-border-light last:border-0 hover:bg-lighter/50">
                            <td className="py-3 px-4 font-medium text-charcoal">
                              {doc.attributes.title || '—'}
                              {doc.attributes.category?.data && (
                                <span className="ml-2 inline-flex">
                                  <Badge variant="outline">{doc.attributes.category.data.attributes.name}</Badge>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-steel">
                              {formatDate(doc.attributes.publishedAt ?? null)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {fileUrl && (
                                <a
                                  href={getDocumentDownloadUrl(fileUrl, fileName)}
                                  download={fileName ?? undefined}
                                  className="text-primary hover:underline mr-3"
                                >
                                  Download
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
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {initialDocuments.map((doc) => (
                  <SectionDocumentCard key={doc.id} doc={doc} formatDate={formatDate} icon={DocumentIcon} />
                ))}
              </div>
            )}
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
      </section>

    </>
  );
}

function SectionDocumentCard({
  doc,
  formatDate,
  icon: Icon = FileText,
}: {
  doc: Document;
  formatDate: (date: string | null) => string;
  icon?: LucideIcon;
}) {
  const fileUrl = doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.url;
  const externalLink = doc.attributes.externalLink ?? null;

  return (
    <Card hover className="h-full flex flex-col">
      <CardContent className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
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
              {formatDate(doc.attributes.publishedAt ?? null)}
            </span>
            <div className="flex gap-2">
              {fileUrl && (
                <a
                  href={getDocumentDownloadUrl(fileUrl, doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.name)}
                  download={doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.name}
                  className="p-2 rounded-md hover:bg-light transition-colors text-steel hover:text-charcoal"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          {externalLink && (
            <a
              href={externalLink}
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
  );
}
