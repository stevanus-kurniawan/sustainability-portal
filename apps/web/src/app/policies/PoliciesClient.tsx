'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Calendar, Tag as TagIcon, Download, Search } from 'lucide-react';

import { Badge, Card, CardContent, EmptyState, Input, ViewModeToggle, getStoredViewMode, type ViewMode } from '@/components/ui';
import type { Document } from '@/lib/api';
import { getDocumentDownloadUrl } from '@/lib/api';

interface PoliciesClientProps {
  policies: Document[];
  currentSearch?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const VIEW_STORAGE_KEY = 'policies-page';

export function PoliciesClient({ policies, currentSearch = '', emptyTitle, emptyDescription }: PoliciesClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchInput, setSearchInput] = useState(currentSearch);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setViewMode(getStoredViewMode(VIEW_STORAGE_KEY));
  }, []);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set('search', q);
    else params.delete('search');
    router.push(`/policies${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const showEmpty = !policies || policies.length === 0;

  return (
    <div className="space-y-6">
      <form onSubmit={onSearchSubmit} className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full max-w-sm sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel pointer-events-none" />
          <Input
            type="search"
            placeholder="Search policies..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 w-full"
            aria-label="Search policies"
          />
        </div>
        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          storageKey={VIEW_STORAGE_KEY}
          ariaLabel="Policies view"
        />
      </form>

      {showEmpty ? (
        <EmptyState
          type="no-data"
          title={emptyTitle ?? 'No policies available'}
          description={emptyDescription}
        />
      ) : (
        <>
          <p className="text-sm text-steel">
            Showing {policies.length} policy{policies.length !== 1 ? 'ies' : ''}
          </p>

      {viewMode === 'grid' ? (
        <div className="grid gap-6">
          {policies.map((policy: Document) => (
            <PolicyCard key={policy.id} policy={policy} formatDate={(d) => formatDate(d)} />
          ))}
        </div>
      ) : (
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
              {policies.map((policy) => {
                const attrs = policy.attributes as typeof policy.attributes & {
                  code?: string | null;
                  documentType?: string | null;
                  versionLabel?: string | null;
                  effectiveDate?: string | null;
                };
                const currentVersion = (attrs.currentVersion as {
                  data?: { attributes?: { versionNo?: number | null; validFrom?: string | null } } | null;
                } | null)?.data;
                const versionNo = currentVersion?.attributes?.versionNo ?? null;
                const effectiveFrom = currentVersion?.attributes?.validFrom ?? null;
                const fileUrl = currentVersion?.attributes
                  ? (currentVersion as any).attributes.file?.data?.attributes?.url ?? null
                  : null;
                const fileName = currentVersion?.attributes
                  ? (currentVersion as any).attributes.file?.data?.attributes?.name ?? null
                  : null;
                const externalLink = attrs.externalLink ?? null;

                const displayCode = attrs.code ?? '—';
                const displayType = attrs.documentType ?? attrs.type ?? '—';
                const displayVersion = attrs.versionLabel ?? (versionNo != null ? String(versionNo) : '—');
                const displayEffectiveDate = formatDate(attrs.effectiveDate ?? effectiveFrom ?? null);

                return (
                  <tr key={policy.id} className="border-b border-border-light last:border-0 hover:bg-lighter/50">
                    <td className="py-3 px-4 font-medium text-charcoal">
                      {attrs.title || '—'}
                      {attrs.category?.data && (
                        <span className="ml-2 inline-flex">
                          <Badge variant="outline">{attrs.category.data.attributes.name}</Badge>
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
      )}
        </>
      )}
    </div>
  );
}

function PolicyCard({
  policy,
  formatDate,
}: {
  policy: Document;
  formatDate: (date: string | null) => string;
}) {
  const fileUrl = (policy.attributes.currentVersion as any)?.data?.attributes?.file?.data?.attributes?.url ?? null;
  const fileName = (policy.attributes.currentVersion as any)?.data?.attributes?.file?.data?.attributes?.name ?? null;
  const externalLink = (policy.attributes as any).externalLink ?? null;

  return (
    <Card hover>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg font-semibold text-charcoal mb-2">
              {policy.attributes.title}
            </h3>
            {policy.attributes.description && (
              <p className="text-sm text-steel mb-4 line-clamp-2">
                {policy.attributes.description.replace(/<[^>]*>/g, '')}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-steel">
              {policy.attributes.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(policy.attributes.publishedAt)}
                </span>
              )}
              {policy.attributes.category?.data && (
                <Badge variant="outline">{policy.attributes.category.data.attributes.name}</Badge>
              )}
              {policy.attributes.tags?.data?.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="default">
                  <TagIcon className="h-3 w-3 mr-1" />
                  {tag.attributes.name}
                </Badge>
              ))}
            </div>
            {externalLink && (
              <a
                href={externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                Learn more →
              </a>
            )}
          </div>
          {fileUrl && (
            <a
              href={getDocumentDownloadUrl(fileUrl, fileName)}
              download={fileName ?? undefined}
              className="p-2 rounded-md hover:bg-light transition-colors text-steel hover:text-charcoal flex-shrink-0"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
