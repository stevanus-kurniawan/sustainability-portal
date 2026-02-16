'use client';

import { FileText, Calendar, Download, ClipboardList, FileBarChart, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';

import { Card, CardContent, Badge, EmptyState, Pagination } from '@/components/ui';
import type { Document } from '@/lib/api';
import { getDocumentDownloadUrl } from '@/lib/api';

function getDocumentIcon(sectionPath: string): LucideIcon {
  if (sectionPath.endsWith('/sop')) return ClipboardList;
  if (sectionPath.endsWith('/sustainability-report')) return FileBarChart;
  return FileText;
}

interface SectionDocumentsClientProps {
  initialDocuments: Document[];
  totalPages: number;
  currentPage: number;
  sectionPath: string;
  categoryName: string;
}

export function SectionDocumentsClient({
  initialDocuments,
  totalPages,
  currentPage,
  sectionPath,
  categoryName,
}: SectionDocumentsClientProps) {
  const DocumentIcon = getDocumentIcon(sectionPath);
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

  const sectionHref = `/${sectionPath}`;

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
        {initialDocuments.length === 0 ? (
          <EmptyState
            type="no-data"
            title="No documents yet"
            description="Documents for this section will appear here once they are published."
          />
        ) : (
          <>
            <p className="text-sm text-steel mb-6">
              Showing {initialDocuments.length} document{initialDocuments.length !== 1 && 's'}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {initialDocuments.map((doc) => (
                <SectionDocumentCard key={doc.id} doc={doc} formatDate={formatDate} icon={DocumentIcon} />
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
  formatDate: (date: string) => string;
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
