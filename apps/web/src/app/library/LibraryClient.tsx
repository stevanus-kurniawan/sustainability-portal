'use client';

import {
  Search,
  Filter,
  FileText,
  Calendar,
  Download,
  X,
  Grid3X3,
  List,
} from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useCallback, useTransition } from 'react';

import { Card, CardContent, Badge, Button, EmptyState, Pagination } from '@/components/ui';
import type { Document, Category, Tag } from '@/lib/api';
import { getDocumentDownloadUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

interface LibraryClientProps {
  initialDocuments: Document[];
  categories: Category[];
  tags: Tag[];
  totalPages: number;
  currentPage: number;
}

const DOCUMENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'POLICY', label: 'Policy' },
  { value: 'CERTIFICATION', label: 'Certification' },
  { value: 'LICENSE', label: 'License' },
  { value: 'GRIEVANCE', label: 'Grievance' },
  { value: 'TRACEABILITY', label: 'Traceability' },
  { value: 'GENERAL', label: 'General' },
];

export function LibraryClient({
  initialDocuments,
  categories,
  tags,
  totalPages,
  currentPage,
}: LibraryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const searchQuery = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category') || '';
  const tagFilter = searchParams.get('tags') || '';
  const typeFilter = searchParams.get('type') || '';

  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      if (!updates.page) params.delete('page');
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [pathname, router, searchParams]
  );

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;
    updateFilters({ search });
  };

  const handleClearFilters = () => {
    startTransition(() => router.push(pathname));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const hasActiveFilters = !!(searchQuery || categoryFilter || tagFilter || typeFilter);

  return (
    <>
      <div className="sticky top-16 z-40 bg-lighter border-b border-border-light py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel" />
                <input
                  type="text"
                  name="search"
                  defaultValue={searchQuery}
                  placeholder="Search documents..."
                  className="input pl-10 pr-4"
                />
              </div>
            </form>
            <div className="flex items-center gap-2">
              <Button
                variant={filtersOpen ? 'primary' : 'outline'}
                onClick={() => setFiltersOpen(!filtersOpen)}
                leftIcon={<Filter className="h-4 w-4" />}
              >
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 h-5 w-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
              <div className="hidden sm:flex items-center border border-border-medium rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn('p-2 rounded-l-md transition-colors', viewMode === 'grid' ? 'bg-primary text-white' : 'hover:bg-light')}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn('p-2 rounded-r-md transition-colors', viewMode === 'list' ? 'bg-primary text-white' : 'hover:bg-light')}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {filtersOpen && (
            <div className="mt-4 p-4 bg-surface rounded-lg border border-border-light">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label mb-2 block">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => updateFilters({ category: e.target.value })}
                    className="input"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.attributes.slug}>
                        {cat.attributes.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label mb-2 block">Document Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => updateFilters({ type: e.target.value })}
                    className="input"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label mb-2 block">Tag</label>
                  <select
                    value={tagFilter}
                    onChange={(e) => updateFilters({ tags: e.target.value })}
                    className="input"
                  >
                    <option value="">All Tags</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.attributes.slug}>
                        {tag.attributes.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {searchQuery && (
                      <Badge variant="info">
                        Search: &quot;{searchQuery}&quot;
                        <button onClick={() => updateFilters({ search: '' })} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {categoryFilter && (
                      <Badge variant="outline">
                        Category: {categories.find((c) => c.attributes.slug === categoryFilter)?.attributes.name}
                        <button onClick={() => updateFilters({ category: '' })} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {typeFilter && (
                      <Badge variant="outline">
                        Type: {DOCUMENT_TYPES.find((t) => t.value === typeFilter)?.label}
                        <button onClick={() => updateFilters({ type: '' })} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {tagFilter && (
                      <Badge variant="default">
                        Tag: {tags.find((t) => t.attributes.slug === tagFilter)?.attributes.name}
                        <button onClick={() => updateFilters({ tags: '' })} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <section className={cn('py-8', isPending && 'opacity-50')}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {initialDocuments.length === 0 ? (
            <EmptyState
              type={hasActiveFilters ? 'no-results' : 'no-data'}
              title={hasActiveFilters ? 'No documents found' : 'No documents available'}
              description={
                hasActiveFilters ? 'Try adjusting your search or filters' : 'Documents will be published here once available'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <p className="text-sm text-steel mb-6">
                Showing {initialDocuments.length} document{initialDocuments.length !== 1 && 's'}
              </p>
              {viewMode === 'grid' ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {initialDocuments.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} formatDate={formatDate} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {initialDocuments.map((doc) => (
                    <DocumentRow key={doc.id} document={doc} formatDate={formatDate} />
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => updateFilters({ page: String(page) })}
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

function DocumentCard({
  document: doc,
  formatDate,
}: {
  document: Document;
  formatDate: (date: string) => string;
}) {
  const fileUrl = doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.url;
  const externalLink = doc.attributes.externalLink ?? null;
  return (
    <Card hover className="h-full flex flex-col">
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

function DocumentRow({
  document: doc,
  formatDate,
}: {
  document: Document;
  formatDate: (date: string) => string;
}) {
  const fileUrl = doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.url;
  const externalLink = doc.attributes.externalLink ?? null;
  return (
    <Card hover>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h3 className="font-medium text-charcoal truncate">{doc.attributes.title}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-steel">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(doc.attributes.publishedAt)}
              </span>
              {doc.attributes.category?.data && (
                <Badge variant="outline" className="text-xs">
                  {doc.attributes.category.data.attributes.name}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {fileUrl && (
              <a
                href={getDocumentDownloadUrl(fileUrl, doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.name)}
                download={doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.name}
                className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
            {externalLink && (
              <a
                href={externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Learn more →
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
