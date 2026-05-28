'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BellRing,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileBadge,
  FileBarChart,
  FileText,
  Leaf,
  LogOut,
  MessageSquareWarning,
  Paperclip,
  Scale,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card, CardContent } from '@/components/ui';
import { userLogout, userMe } from '@/lib/auth-api';
import type { Certification, Document, DocumentFile, License } from '@/lib/api';

type DashboardView = 'main' | 'sustainability' | 'operational-units' | 'unit-detail' | 'unit-records' | 'documents' | 'regulations';
type ContentView = 'policies' | 'procedures' | 'reports' | 'standards' | 'grievance' | 'updates';
type RegulationKind = 'ALL' | 'NATIONAL' | 'INTERNATIONAL';
type UnitSectionKey = 'certifications' | 'procedures' | 'licenses';

type DashboardCard = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  view?: ContentView;
};

type OperationalUnitItem = {
  id: number;
  attributes: {
    name: string;
    slug: string;
  };
};

type UnitDetail = {
  procedures: Document[];
  certifications: Certification[];
  licenses: License[];
};
type PreviewFile = DocumentFile['attributes'] & { title: string };
type DocumentTableVariant = 'default' | 'report' | 'regulation' | 'standard' | 'grievance' | 'procedure' | 'operationalProcedure' | 'updates';

const DASHBOARD_CARDS: DashboardCard[] = [
  {
    title: 'Sustainability',
    description: 'Access certifications, licenses, policies, and compliance documentation.',
    icon: Leaf,
    accentClass: 'bg-primary/10 text-primary',
  },
  {
    title: 'Operational Unit',
    description: 'View certifications, licenses, and documents for each operational unit.',
    icon: Building2,
    accentClass: 'bg-success/10 text-success',
  },
  {
    title: 'Updates',
    description: 'Stay informed on the latest changes, uploads, and compliance activities.',
    icon: BellRing,
    accentClass: 'bg-warning/10 text-warning',
    view: 'updates',
  },
];

const SUSTAINABILITY_MENU_CARDS: DashboardCard[] = [
  {
    title: 'Policy',
    description: 'Explore foundational principles and commitments.',
    icon: FileText,
    accentClass: 'bg-primary/10 text-primary',
    view: 'policies',
  },
  {
    title: 'Procedure',
    description: 'Access detailed workflows and operational guidelines.',
    icon: ClipboardList,
    accentClass: 'bg-charcoal/10 text-charcoal',
    view: 'procedures',
  },
  {
    title: 'Sustainability Report',
    description: 'Review annual progress and ESG reports.',
    icon: FileBarChart,
    accentClass: 'bg-brand-deep/10 text-brand-deep',
    view: 'reports',
  },
  {
    title: 'Regulation',
    description: 'Navigate legal frameworks and governmental compliance.',
    icon: Scale,
    accentClass: 'bg-warning/10 text-warning',
  },
  {
    title: 'Standards',
    description: 'View industry benchmarks and international criteria.',
    icon: ShieldCheck,
    accentClass: 'bg-success/10 text-success',
    view: 'standards',
  },
  {
    title: 'Grievance',
    description: 'Secure channel to report concerns and seek resolutions.',
    icon: MessageSquareWarning,
    accentClass: 'bg-danger/10 text-danger',
    view: 'grievance',
  },
];

const CONTENT_CONFIG: Record<ContentView, { title: string; subtitle: string; empty: string }> = {
  policies: {
    title: 'Policy',
    subtitle: 'Published policy records.',
    empty: 'No policies available.',
  },
  procedures: {
    title: 'Procedure',
    subtitle: 'Holding company sustainability procedure records.',
    empty: 'No procedures available.',
  },
  reports: {
    title: 'Sustainability Report',
    subtitle: 'Published sustainability reports.',
    empty: 'No sustainability reports available.',
  },
  standards: {
    title: 'Standards',
    subtitle: 'Published standard and benchmark records.',
    empty: 'No standards available.',
  },
  grievance: {
    title: 'Grievance',
    subtitle: 'Published grievance mechanism resources.',
    empty: 'No grievance resources available.',
  },
  updates: {
    title: 'Updates',
    subtitle: 'Latest announcements and compliance updates.',
    empty: 'No updates available.',
  },
};

const CONTENT_TABLE_VARIANT: Record<ContentView, DocumentTableVariant> = {
  policies: 'default',
  procedures: 'procedure',
  reports: 'report',
  standards: 'standard',
  grievance: 'grievance',
  updates: 'updates',
};

const CONTENT_ENDPOINTS: Record<ContentView, string> = {
  policies: '/api/v1/public/policies?pageSize=100',
  procedures: '/api/v1/public/procedures?pageSize=100&procedureScope=SUSTAINABILITY',
  reports: '/api/v1/public/library?pageSize=100&category=sustainability-report',
  standards: '/api/v1/public/library?pageSize=100&category=standard',
  grievance: '/api/v1/public/library?pageSize=100&type=GRIEVANCE',
  updates: '/api/v1/public/updates?pageSize=100',
};

const CONTENT_VIEW_PARAMS: Record<ContentView, string> = {
  policies: 'policy',
  procedures: 'procedure',
  reports: 'sustainability-report',
  standards: 'standards',
  grievance: 'grievance',
  updates: 'updates',
};

const CONTENT_PARAM_TO_VIEW = Object.fromEntries(
  Object.entries(CONTENT_VIEW_PARAMS).map(([key, value]) => [value, key]),
) as Record<string, ContentView>;

const emptyContentState: Record<ContentView, Document[]> = {
  policies: [],
  procedures: [],
  reports: [],
  standards: [],
  grievance: [],
  updates: [],
};

const emptyContentFlags: Record<ContentView, boolean> = {
  policies: false,
  procedures: false,
  reports: false,
  standards: false,
  grievance: false,
  updates: false,
};

const emptyUnitDetailLoaded: Record<UnitSectionKey, boolean> = {
  certifications: false,
  procedures: false,
  licenses: false,
};

const rowsPerPage = 6;
const unitsPerPage = 20;

function withPagination(endpoint: string, page: number, pageSize: number) {
  const [path, query = ''] = endpoint.split('?');
  const params = new URLSearchParams(query);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return `${path}?${params.toString()}`;
}

async function fetchPublicPage<T>(endpoint: string, page: number, pageSize = 100): Promise<{ data: T[]; pageCount: number }> {
  const response = await fetch(withPagination(endpoint, page, pageSize), { cache: 'no-store' });
  if (!response.ok) return { data: [], pageCount: 1 };
  const payload = await response.json().catch(() => ({ data: [] }));
  return {
    data: Array.isArray(payload?.data) ? (payload.data as T[]) : [],
    pageCount: Number(payload?.meta?.pagination?.pageCount) || 1,
  };
}

async function fetchPublicList<T>(endpoint: string): Promise<T[]> {
  const firstPage = await fetchPublicPage<T>(endpoint, 1);
  if (firstPage.pageCount <= 1) return firstPage.data;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.pageCount - 1 }, (_, index) =>
      fetchPublicPage<T>(endpoint, index + 2).then((page) => page.data),
    ),
  );
  return firstPage.data.concat(...remainingPages);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function dashboardUrl(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `/?${query}` : '/';
}

function contentViewFromParam(value: string | null): ContentView | null {
  if (!value) return null;
  return CONTENT_PARAM_TO_VIEW[value] ?? null;
}

function unitSectionFromParam(value: string | null): UnitSectionKey {
  return value === 'procedures' || value === 'licenses' || value === 'certifications' ? value : 'certifications';
}

function fileFromDocument(doc: Document) {
  return doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes ?? null;
}

function previewUrlForFile(file: DocumentFile['attributes']) {
  if (file.key) {
    const params = new URLSearchParams({ key: file.key });
    if (file.name) params.set('filename', file.name);
    return `/api/v1/public/files/preview?${params.toString()}`;
  }
  return file.url;
}

function filePreviewKind(file: Pick<DocumentFile['attributes'], 'mime' | 'name'>) {
  const mime = (file.mime || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) return 'image';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  return 'unsupported';
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function matchesSearch(values: Array<string | null | undefined>, query: string) {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;
  return values.some((value) => (value ?? '').toLowerCase().includes(normalized));
}

function matchesDocumentSearch(doc: Document, query: string) {
  return matchesSearch(
    [
      doc.attributes.title,
      doc.attributes.description,
      doc.attributes.code,
      doc.attributes.versionLabel,
      doc.attributes.documentType,
      doc.attributes.regulationKind,
      formatDate(doc.attributes.effectiveDate),
    ],
    query,
  );
}

function statusDisplay(status?: string | null) {
  if (status === 'PENDING_RENEWAL') return 'Pending Renewal';
  if (status === 'IN_REVIEW') return 'In Review';
  if (status === 'RESOLVED') return 'Resolved';
  if (status === 'OPEN') return 'Open';
  if (status === 'NONE') return '-';
  return status || '-';
}

function visitorCertificateLicenseStatusDisplay(status?: string | null) {
  if (status === 'EXPIRED') return 'Expired';
  if (status === 'ACTIVE' || status === 'EXPIRING') return 'Active';
  return statusDisplay(status);
}

function isVisibleVisitorCertificateLicense(status?: string | null) {
  return status !== 'EXPIRED';
}

function statusClass(status?: string | null) {
  if (status === 'OPEN') return 'bg-danger/10 text-danger';
  if (status === 'IN_REVIEW') return 'bg-warning/10 text-warning';
  if (status === 'RESOLVED') return 'bg-success/10 text-success';
  if (status === 'PENDING_RENEWAL') return 'bg-warning/10 text-warning';
  return 'bg-light text-steel';
}

function AttachmentPreviewModal({
  file,
  onClose,
}: {
  file: PreviewFile | null;
  onClose: () => void;
}) {
  if (!file) return null;
  const previewUrl = previewUrlForFile(file);
  const previewKind = filePreviewKind(file);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/70 p-0 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-xl bg-surface shadow-xl sm:h-[88vh] sm:rounded-xl">
        <div className="flex flex-shrink-0 flex-col gap-3 border-b border-border-light px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="min-w-0">
            <p className="truncate font-heading text-base font-semibold text-charcoal">{file.title}</p>
            <p className="truncate text-xs text-steel">{file.name}</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-md border border-border-light px-3 text-sm font-medium text-primary transition-colors hover:bg-light"
            >
              Open
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border-light text-steel transition-colors hover:bg-light hover:text-charcoal"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-light">
          {previewKind === 'image' ? (
            <div className="flex h-full items-center justify-center p-4">
              <img src={previewUrl} alt={file.name || file.title} className="max-h-full max-w-full rounded-md object-contain shadow-sm" />
            </div>
          ) : previewKind === 'pdf' ? (
            <iframe title={file.title} src={previewUrl} className="h-full w-full border-0" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-steel">
              <p>This file type cannot be previewed in the browser.</p>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Open attachment
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const VISITOR_RECORD_TABLE_MIN_WIDTH = 'min-w-[52rem]';

function VisitorTableScroll({
  header,
  children,
  page,
  pageCount,
  onPageChange,
  minWidth = VISITOR_RECORD_TABLE_MIN_WIDTH,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  minWidth?: string;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-x-auto">
      <div className={`${minWidth} flex h-full min-h-0 w-full flex-1 flex-col`}>
        <div className="flex-shrink-0">{header}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        <PaginationControls page={page} pageCount={pageCount} onPageChange={onPageChange} />
      </div>
    </div>
  );
}

function PaginationControls({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-auto flex flex-shrink-0 flex-wrap items-center justify-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="inline-flex items-center gap-2 rounded-md border border-border-light bg-surface px-3 py-2 text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sm:hidden">Prev</span>
        <span className="hidden sm:inline">Previous</span>
      </button>
      <span className="text-sm text-steel">
        Page {page + 1} of {pageCount}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
        disabled={page >= pageCount - 1}
        className="inline-flex items-center gap-2 rounded-md border border-border-light bg-surface px-3 py-2 text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function BackTitle({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:relative sm:flex-row sm:items-center sm:justify-center">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-2 rounded-md border border-border-light bg-surface px-3 py-2 text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-light sm:absolute sm:left-0"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h2 className="break-words px-0 text-center font-heading text-xl font-bold text-primary sm:px-12 sm:text-2xl lg:text-3xl">
        {title}
      </h2>
    </div>
  );
}

function MenuCard({ card, onClick, compact = false }: { card: DashboardCard; onClick: () => void; compact?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="group h-full text-left">
      <Card
        hover
        className={`flex h-full ${compact ? 'min-h-[9.5rem]' : 'min-h-[12rem]'} border-border-light bg-surface transition-transform duration-200 group-hover:-translate-y-1`}
      >
        <CardContent className={`flex h-full flex-col ${compact ? 'items-center justify-center p-4 text-center sm:p-5' : 'p-5 sm:p-6'}`}>
          <div className={`inline-flex ${compact ? 'h-11 w-11' : 'h-12 w-12'} items-center justify-center rounded-lg ${card.accentClass}`}>
            <card.icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
          </div>
          <h3 className={`${compact ? 'mt-3 text-lg' : 'mt-4 text-xl'} font-heading font-semibold text-charcoal`}>
            {card.title}
          </h3>
          <p className={`${compact ? 'mt-1 leading-snug' : 'mt-2 leading-relaxed'} text-sm text-steel`}>{card.description}</p>
        </CardContent>
      </Card>
    </button>
  );
}

function DocumentTable({
  title,
  subtitle,
  documents,
  loading,
  emptyText,
  page,
  onPageChange,
  variant = 'default',
  filter,
  searchTerm,
  onSearchChange,
  onPreviewFile,
  hideHeader = false,
}: {
  title: string;
  subtitle: string;
  documents: Document[];
  loading: boolean;
  emptyText: string;
  page: number;
  onPageChange: (page: number) => void;
  variant?: DocumentTableVariant;
  filter?: React.ReactNode;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onPreviewFile: (file: PreviewFile) => void;
  hideHeader?: boolean;
}) {
  const filteredDocuments = documents.filter((doc) => matchesDocumentSearch(doc, searchTerm));
  const pageCount = Math.max(1, Math.ceil(filteredDocuments.length / rowsPerPage));
  const paged = filteredDocuments.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const columns =
    variant === 'report'
      ? ['Title', 'Period', 'Scope', 'Version', 'Publish Date', 'Actions']
      : variant === 'regulation'
        ? ['Title', 'Code', 'Jurisdiction', 'Version', 'Effective Date', 'Actions']
        : variant === 'standard'
          ? ['Title', 'Code', 'Body', 'Version', 'Effective Date', 'Actions']
          : variant === 'grievance'
            ? ['Title', 'Reference Number', 'Status', 'Submitted Date', 'Attachment']
            : variant === 'operationalProcedure'
              ? ['Title', 'Code', 'Type', 'Version', 'Effective Date', 'Actions']
              : variant === 'updates'
                ? ['Title', 'Description', 'Date', 'Actions']
              : ['Title', 'Code', 'Version', 'Effective Date', 'Actions'];
  const gridClass =
    variant === 'default' || variant === 'procedure'
      ? 'grid-cols-[1.5fr_0.75fr_0.75fr_0.9fr_0.75fr]'
      : variant === 'updates'
        ? 'grid-cols-[1.25fr_1.5fr_0.75fr_0.75fr]'
      : 'grid-cols-[1.35fr_0.75fr_0.85fr_0.75fr_0.9fr_0.75fr]';
  const tableMinWidth =
    variant === 'operationalProcedure'
      ? VISITOR_RECORD_TABLE_MIN_WIDTH
      : variant === 'default' || variant === 'procedure'
        ? 'min-w-[40rem]'
        : variant === 'updates'
          ? 'min-w-[36rem]'
          : VISITOR_RECORD_TABLE_MIN_WIDTH;

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${hideHeader ? '' : 'rounded-xl border border-border-light bg-surface shadow-sm'}`}>
        {!hideHeader && (
          <div className="flex flex-shrink-0 flex-col gap-3 border-b border-border-light px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-charcoal">{title}</p>
              <p className="text-xs text-steel">{subtitle}</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <label className="relative block w-full sm:w-52">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
                <input
                  className="input h-9 w-full pl-9"
                  value={searchTerm}
                  onChange={(event) => {
                    onSearchChange(event.target.value);
                    onPageChange(0);
                  }}
                  placeholder="Search"
                />
              </label>
              {filter}
            </div>
          </div>
        )}
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-x-auto">
          <div className={`${tableMinWidth} flex h-full min-h-0 flex-1 flex-col`}>
            <div className={`grid ${gridClass} flex-shrink-0 gap-3 border-b border-border-light px-3 py-3 text-xs font-semibold uppercase tracking-wide text-steel sm:px-4`}>
              {columns.map((column) => (
                <span key={column} className={column === 'Actions' || column === 'Attachment' ? 'text-center' : undefined}>
                  {column}
                </span>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex min-h-[12rem] items-center justify-center text-sm text-steel">Loading records…</div>
              ) : paged.length === 0 ? (
                <div className="flex min-h-[12rem] items-center justify-center px-4 text-center text-sm text-steel">{emptyText}</div>
              ) : (
                <div className="divide-y divide-border-light">
                  {paged.map((doc) => {
                    const file = fileFromDocument(doc);
                    return (
                      <div key={doc.id} className={`grid ${gridClass} items-center gap-3 px-3 py-3 text-sm sm:px-4`}>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-charcoal">{doc.attributes.title}</p>
                    </div>
                    {variant === 'report' ? (
                      <>
                        <span className="truncate text-steel">{doc.attributes.code || '-'}</span>
                        <span className="truncate text-steel">{doc.attributes.documentType || '-'}</span>
                        <span className="truncate text-steel">{doc.attributes.versionLabel || '-'}</span>
                        <span className="truncate text-steel">{formatDate(doc.attributes.effectiveDate)}</span>
                      </>
                    ) : variant === 'regulation' || variant === 'standard' || variant === 'operationalProcedure' ? (
                      <>
                        <span className="truncate text-steel">{doc.attributes.code || '-'}</span>
                        <span className="truncate text-steel">{doc.attributes.documentType || '-'}</span>
                        <span className="truncate text-steel">{doc.attributes.versionLabel || '-'}</span>
                        <span className="truncate text-steel">{formatDate(doc.attributes.effectiveDate)}</span>
                      </>
                    ) : variant === 'grievance' ? (
                      <>
                        <span className="truncate text-steel">{doc.attributes.code || '-'}</span>
                        <span className={`w-fit rounded-full px-2 py-1 text-xs font-medium ${statusClass(doc.attributes.documentType)}`}>
                          {statusDisplay(doc.attributes.documentType)}
                        </span>
                        <span className="truncate text-steel">{formatDate(doc.attributes.effectiveDate)}</span>
                      </>
                    ) : variant === 'updates' ? (
                      <>
                        <span className="line-clamp-2 text-steel">{doc.attributes.description || '-'}</span>
                        <span className="truncate text-steel">{formatDate(doc.attributes.effectiveDate)}</span>
                      </>
                    ) : (
                      <>
                        <span className="truncate text-steel">{doc.attributes.code || '-'}</span>
                        <span className="truncate text-steel">{doc.attributes.versionLabel || '-'}</span>
                        <span className="truncate text-steel">{formatDate(doc.attributes.effectiveDate)}</span>
                      </>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      {variant !== 'grievance' && doc.attributes.externalLink && (
                        <a
                          href={doc.attributes.externalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-light text-primary transition-colors hover:bg-light"
                          aria-label={`Open external link for ${doc.attributes.title}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {file?.url && (
                        <button
                          type="button"
                          onClick={() => onPreviewFile({ ...file, title: doc.attributes.title })}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-light text-primary transition-colors hover:bg-light"
                          aria-label={`Open attachment for ${doc.attributes.title}`}
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                      )}
                      {((variant === 'grievance' && !file?.url) || (variant !== 'grievance' && !doc.attributes.externalLink && !file?.url)) && (
                        <span className="text-xs text-steel">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </div>
            <PaginationControls page={page} pageCount={pageCount} onPageChange={onPageChange} />
          </div>
        </div>
      </div>
  );
}

export function UserLandingDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userName, setUserName] = useState('User');
  const [currentView, setCurrentView] = useState<DashboardView>('main');
  const [activeContent, setActiveContent] = useState<ContentView>('policies');
  const [contentPage, setContentPage] = useState(0);
  const [contentSearch, setContentSearch] = useState('');
  const [unitsPage, setUnitsPage] = useState(0);
  const [unitSearch, setUnitSearch] = useState('');
  const [regulationsPage, setRegulationsPage] = useState(0);
  const [regulationSearch, setRegulationSearch] = useState('');
  const [selectedRegulationKind, setSelectedRegulationKind] = useState<RegulationKind>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<OperationalUnitItem | null>(null);
  const [selectedUnitSection, setSelectedUnitSection] = useState<UnitSectionKey>('certifications');
  const [unitRecordsPage, setUnitRecordsPage] = useState(0);
  const [unitRecordSearch, setUnitRecordSearch] = useState('');
  const [unitDetail, setUnitDetail] = useState<UnitDetail>({ procedures: [], certifications: [], licenses: [] });
  const [unitDetailLoading, setUnitDetailLoading] = useState(false);
  const [unitDetailLoaded, setUnitDetailLoaded] = useState<Record<UnitSectionKey, boolean>>(emptyUnitDetailLoaded);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [operationalUnits, setOperationalUnits] = useState<OperationalUnitItem[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsLoaded, setUnitsLoaded] = useState(false);
  const [documents, setDocuments] = useState<Record<ContentView, Document[]>>(emptyContentState);
  const [contentLoading, setContentLoading] = useState<Record<ContentView, boolean>>(emptyContentFlags);
  const [contentLoaded, setContentLoaded] = useState<Record<ContentView, boolean>>(emptyContentFlags);
  const [regulations, setRegulations] = useState<Document[]>([]);
  const [regulationsLoading, setRegulationsLoading] = useState(false);
  const [regulationsLoaded, setRegulationsLoaded] = useState(false);

  const filteredUnits = operationalUnits.filter((unit) =>
    matchesSearch([unit.attributes.name, unit.attributes.slug], unitSearch),
  );
  const totalUnitPages = Math.max(1, Math.ceil(filteredUnits.length / unitsPerPage));
  const pagedUnits = filteredUnits.slice(unitsPage * unitsPerPage, (unitsPage + 1) * unitsPerPage);
  const filteredRegulations =
    selectedRegulationKind === 'ALL'
      ? regulations
      : regulations.filter((doc) => doc.attributes.regulationKind === selectedRegulationKind);

  useEffect(() => {
    userMe()
      .then((user) => {
        if (user?.name) setUserName(user.name);
      })
      .catch(() => setUserName('User'));
  }, []);

  const currentContent = documents[activeContent];
  const contentConfig = CONTENT_CONFIG[activeContent];
  const unitSections = useMemo(
    () => [
      {
        key: 'certifications' as UnitSectionKey,
        title: 'Certificate',
        description: 'View official sustainability, quality, and operational certifications awarded to this unit',
        icon: <Award className="h-4 w-4" />,
        items: unitDetail.certifications.map((cert) => ({
          id: `cert-${cert.id}`,
          title: cert.attributes.name,
          description: cert.attributes.issuer,
          href: cert.attributes.document?.data?.attributes.currentVersion?.data?.attributes.file?.data?.attributes.url,
        })),
      },
      {
        key: 'procedures' as UnitSectionKey,
        title: 'Procedure',
        description: 'Access detailed Standard Operating Procedures (SOPs) and guidelines specific to this operational unit',
        icon: <ClipboardList className="h-4 w-4" />,
        items: unitDetail.procedures.map((doc) => ({
          id: `procedure-${doc.id}`,
          title: doc.attributes.title,
          description: doc.attributes.code || doc.attributes.versionLabel || doc.attributes.description,
          href: fileFromDocument(doc)?.url || doc.attributes.externalLink || undefined,
        })),
      },
      {
        key: 'licenses' as UnitSectionKey,
        title: 'License',
        description: 'Manage and review the legal permits and regulatory licenses required for daily operations',
        icon: <FileBadge className="h-4 w-4" />,
        items: unitDetail.licenses.map((license) => ({
          id: `license-${license.id}`,
          title: license.attributes.name,
          description: license.attributes.authority,
          href: license.attributes.document?.data?.attributes.currentVersion?.data?.attributes.file?.data?.attributes.url,
        })),
      },
    ],
    [unitDetail],
  );
  const selectedUnitSectionData = unitSections.find((section) => section.key === selectedUnitSection) ?? unitSections[0];
  const filteredUnitRecords = selectedUnitSectionData.items.filter((item) =>
    matchesSearch([item.title, item.description], unitRecordSearch),
  );
  const filteredUnitProcedures = unitDetail.procedures.filter((doc) => matchesDocumentSearch(doc, unitRecordSearch));
  const filteredUnitCertifications = unitDetail.certifications.filter((cert) =>
    isVisibleVisitorCertificateLicense(cert.attributes.status) &&
    matchesSearch([cert.attributes.name, cert.attributes.issuer, cert.attributes.certificateNo, visitorCertificateLicenseStatusDisplay(cert.attributes.status)], unitRecordSearch),
  );
  const filteredUnitLicenses = unitDetail.licenses.filter((license) =>
    isVisibleVisitorCertificateLicense(license.attributes.status) &&
    matchesSearch([license.attributes.name, license.attributes.authority, license.attributes.licenseNo, visitorCertificateLicenseStatusDisplay(license.attributes.status)], unitRecordSearch),
  );
  const unitProceduresPageCount = Math.max(1, Math.ceil(filteredUnitProcedures.length / rowsPerPage));
  const unitCertificationsPageCount = Math.max(1, Math.ceil(filteredUnitCertifications.length / rowsPerPage));
  const unitLicensesPageCount = Math.max(1, Math.ceil(filteredUnitLicenses.length / rowsPerPage));
  const pagedUnitCertifications = filteredUnitCertifications.slice(
    unitRecordsPage * rowsPerPage,
    (unitRecordsPage + 1) * rowsPerPage,
  );
  const pagedUnitLicenses = filteredUnitLicenses.slice(
    unitRecordsPage * rowsPerPage,
    (unitRecordsPage + 1) * rowsPerPage,
  );

  async function handleLogout() {
    try {
      await userLogout();
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  async function loadContent(view: ContentView) {
    if (contentLoaded[view] || contentLoading[view]) return;
    setContentLoading((prev) => ({ ...prev, [view]: true }));
    let loaded = false;
    try {
      const data = await fetchPublicList<Document>(CONTENT_ENDPOINTS[view]);
      setDocuments((prev) => ({ ...prev, [view]: data }));
      loaded = true;
    } catch {
      setDocuments((prev) => ({ ...prev, [view]: [] }));
    } finally {
      if (loaded) setContentLoaded((prev) => ({ ...prev, [view]: true }));
      setContentLoading((prev) => ({ ...prev, [view]: false }));
    }
  }

  async function loadRegulations() {
    if (regulationsLoaded || regulationsLoading) return;
    setRegulationsLoading(true);
    try {
      setRegulations(await fetchPublicList<Document>('/api/v1/public/regulations?pageSize=100'));
      setRegulationsLoaded(true);
    } catch {
      setRegulations([]);
    } finally {
      setRegulationsLoading(false);
    }
  }

  async function loadOperationalUnits() {
    if (unitsLoaded) return operationalUnits;
    if (unitsLoading) return operationalUnits;
    setUnitsLoading(true);
    try {
      const units = await fetchPublicList<OperationalUnitItem>('/api/v1/public/operational-units?pageSize=100');
      setOperationalUnits(units);
      setUnitsLoaded(true);
      return units;
    } catch {
      setOperationalUnits([]);
      return [];
    } finally {
      setUnitsLoading(false);
    }
  }

  async function loadUnitSection(section: UnitSectionKey, unit = selectedUnit, force = false) {
    if (!unit || (!force && unitDetailLoaded[section]) || unitDetailLoading) return;
    setUnitDetailLoading(true);
    let loaded = false;
    try {
      if (section === 'procedures') {
        const procedures = await fetchPublicList<Document>(
          `/api/v1/public/procedures?pageSize=100&procedureScope=OPERATIONAL_UNIT&operationalUnitId=${unit.id}`,
        );
        setUnitDetail((prev) => ({ ...prev, procedures }));
      } else if (section === 'certifications') {
        const certifications = await fetchPublicList<Certification>(
          `/api/v1/public/certifications?pageSize=100&operationalUnitId=${unit.id}`,
        );
        setUnitDetail((prev) => ({ ...prev, certifications }));
      } else {
        const licenses = await fetchPublicList<License>(
          `/api/v1/public/licenses?pageSize=100&operationalUnitId=${unit.id}`,
        );
        setUnitDetail((prev) => ({ ...prev, licenses }));
      }
      loaded = true;
    } catch {
      if (section === 'procedures') setUnitDetail((prev) => ({ ...prev, procedures: [] }));
      else if (section === 'certifications') setUnitDetail((prev) => ({ ...prev, certifications: [] }));
      else setUnitDetail((prev) => ({ ...prev, licenses: [] }));
    } finally {
      if (loaded) setUnitDetailLoaded((prev) => ({ ...prev, [section]: true }));
      setUnitDetailLoading(false);
    }
  }

  function openContent(view: ContentView) {
    setActiveContent(view);
    setContentPage(0);
    setContentSearch('');
    void loadContent(view);
    router.push(dashboardUrl({ view: CONTENT_VIEW_PARAMS[view] }), { scroll: false });
    setCurrentView('documents');
  }

  const dashboardBackground =
    currentView === 'main'
      ? '/backgrounds/plant.jpeg'
      : currentView === 'sustainability'
        ? '/backgrounds/plant%20at%20night.jpeg'
        : currentView === 'operational-units' || currentView === 'unit-detail' || currentView === 'unit-records'
          ? '/backgrounds/EUP%20Tj.%20Pura.jpeg'
          : '/backgrounds/EUP%20Tj.%20Pura%201.jpeg';

  useEffect(() => {
    let cancelled = false;

    async function restoreViewFromUrl() {
      const view = searchParams.get('view');
      if (!view) {
        setCurrentView('main');
        return;
      }

      const contentView = contentViewFromParam(view);
      if (contentView) {
        setActiveContent(contentView);
        setContentPage(0);
        setContentSearch('');
        setCurrentView('documents');
        await loadContent(contentView);
        return;
      }

      if (view === 'sustainability') {
        setCurrentView('sustainability');
        return;
      }

      if (view === 'regulations') {
        setSelectedRegulationKind('ALL');
        setRegulationsPage(0);
        setRegulationSearch('');
        setCurrentView('regulations');
        await loadRegulations();
        return;
      }

      if (view === 'operational-units') {
        setUnitsPage(0);
        setUnitSearch('');
        setCurrentView('operational-units');
        await loadOperationalUnits();
        return;
      }

      if (view === 'unit-detail' || view === 'unit-records') {
        const unitId = Number(searchParams.get('unitId'));
        if (!Number.isFinite(unitId)) {
          setCurrentView('operational-units');
          await loadOperationalUnits();
          return;
        }

        const units = await loadOperationalUnits();
        if (cancelled) return;
        const unit = units.find((item) => item.id === unitId);
        if (!unit) {
          setCurrentView('operational-units');
          return;
        }

        if (selectedUnit?.id !== unit.id) {
          setUnitDetail({ procedures: [], certifications: [], licenses: [] });
          setUnitDetailLoaded(emptyUnitDetailLoaded);
          setUnitDetailLoading(false);
        }
        setSelectedUnit(unit);

        const section = unitSectionFromParam(searchParams.get('section'));
        setSelectedUnitSection(section);
        setUnitRecordSearch('');
        setUnitRecordsPage(0);
        setCurrentView(view);
        if (view === 'unit-records') {
          await loadUnitSection(section, unit, selectedUnit?.id !== unit.id);
        }
        return;
      }

      setCurrentView('main');
    }

    void restoreViewFromUrl();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-light">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-25 grayscale"
        style={{
          backgroundImage: `url("${dashboardBackground}")`,
          filter: 'grayscale(1) contrast(0.85) brightness(1.12)',
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-light/80" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex min-h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-border-light py-2 sm:py-0">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Image src="/logo.png" alt="Sustainability portal logo" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" unoptimized />
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-semibold text-charcoal">SLMS</p>
              <p className="truncate text-xs text-steel">Sustainability Portal</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden h-10 items-center gap-2 rounded-md border border-border-light bg-surface/95 px-3 shadow-sm sm:flex">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-3.5 w-3.5" />
              </span>
              <span className="max-w-[12rem] truncate text-sm text-charcoal">{userName}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border-light bg-surface/95 px-3 text-sm font-medium text-steel shadow-sm transition-colors hover:bg-light hover:text-charcoal"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden py-4 sm:py-6">
          {currentView === 'main' && (
            <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-2 sm:py-0">
              <div className="w-full max-w-6xl self-center text-center">
                <p className="mb-2 text-base text-steel sm:text-lg">Welcome, {userName}</p>
                <h1 className="font-heading text-2xl font-bold text-charcoal sm:text-4xl lg:text-5xl">SLMS Sustainability Portal</h1>
                <p className="mx-auto mt-3 max-w-3xl text-sm text-steel sm:text-base lg:text-lg">
                  Transparency &amp; accountability in every step of our sustainability journey.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-3 lg:gap-6">
                  {DASHBOARD_CARDS.map((card) => (
                    <MenuCard
                      key={card.title}
                      card={card}
                      onClick={() => {
                        if (card.title === 'Sustainability') {
                          router.push(dashboardUrl({ view: 'sustainability' }), { scroll: false });
                          setCurrentView('sustainability');
                        }
                        else if (card.title === 'Operational Unit') {
                          setUnitsPage(0);
                          setUnitSearch('');
                          void loadOperationalUnits();
                          router.push(dashboardUrl({ view: 'operational-units' }), { scroll: false });
                          setCurrentView('operational-units');
                        } else if (card.view) openContent(card.view);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentView === 'sustainability' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <BackTitle title="Sustainability" onBack={() => {
                router.push('/', { scroll: false });
                setCurrentView('main');
              }} />
              <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-2 sm:items-center sm:py-0">
                <div className="grid w-full max-w-6xl grid-cols-1 gap-3 self-center sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                  {SUSTAINABILITY_MENU_CARDS.map((card) => (
                    <MenuCard
                      key={card.title}
                      card={card}
                      compact
                      onClick={() => {
                        if (card.title === 'Regulation') {
                          setSelectedRegulationKind('ALL');
                          setRegulationsPage(0);
                          setRegulationSearch('');
                          void loadRegulations();
                          router.push(dashboardUrl({ view: 'regulations' }), { scroll: false });
                          setCurrentView('regulations');
                        } else if (card.view) {
                          openContent(card.view);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentView === 'documents' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <BackTitle title={contentConfig.title} onBack={() => {
                if (activeContent === 'updates') {
                  router.push('/', { scroll: false });
                  setCurrentView('main');
                } else {
                  router.push(dashboardUrl({ view: 'sustainability' }), { scroll: false });
                  setCurrentView('sustainability');
                }
              }} />
              <DocumentTable
                title={contentConfig.title}
                subtitle={contentConfig.subtitle}
                documents={currentContent}
                loading={contentLoading[activeContent]}
                emptyText={contentConfig.empty}
                page={contentPage}
                onPageChange={setContentPage}
                variant={CONTENT_TABLE_VARIANT[activeContent]}
                searchTerm={contentSearch}
                onSearchChange={setContentSearch}
                onPreviewFile={setPreviewFile}
              />
            </div>
          )}

          {currentView === 'regulations' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <BackTitle title="Regulation" onBack={() => {
                router.push(dashboardUrl({ view: 'sustainability' }), { scroll: false });
                setCurrentView('sustainability');
              }} />
              <DocumentTable
                title="Regulation list"
                subtitle="Published national and international regulations."
                documents={filteredRegulations}
                loading={regulationsLoading}
                emptyText="No regulations available."
                page={regulationsPage}
                onPageChange={setRegulationsPage}
                searchTerm={regulationSearch}
                onSearchChange={setRegulationSearch}
                variant="regulation"
                onPreviewFile={setPreviewFile}
                filter={
                  <label className="flex w-full flex-col gap-1 text-sm text-steel sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                    Type
                    <select
                      className="input h-9 w-full sm:w-40"
                      value={selectedRegulationKind}
                      onChange={(event) => {
                        setSelectedRegulationKind(event.target.value as RegulationKind);
                        setRegulationsPage(0);
                        setRegulationSearch('');
                      }}
                    >
                      <option value="ALL">All</option>
                      <option value="NATIONAL">National</option>
                      <option value="INTERNATIONAL">International</option>
                    </select>
                  </label>
                }
              />
            </div>
          )}

          {currentView === 'operational-units' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <BackTitle title="Operational Unit" onBack={() => {
                router.push('/', { scroll: false });
                setCurrentView('main');
              }} />
              <div className="mb-3 flex justify-stretch sm:justify-end">
                <label className="relative block w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
                  <input
                    className="input h-9 w-full pl-9"
                    value={unitSearch}
                    onChange={(event) => {
                      setUnitSearch(event.target.value);
                      setUnitsPage(0);
                    }}
                    placeholder="Search operational unit"
                  />
                </label>
              </div>
              <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
                <div className="grid min-h-0 w-full max-w-7xl flex-1 auto-rows-fr grid-cols-2 gap-2 self-center sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5 lg:grid-rows-4 lg:gap-3">
                  {unitsLoading ? (
                    <p className="col-span-full row-span-full flex items-center justify-center text-sm text-steel">Loading operational units…</p>
                  ) : pagedUnits.length === 0 ? (
                    <p className="col-span-full row-span-full flex items-center justify-center text-sm text-steel">No operational units found.</p>
                  ) : pagedUnits.map((unit) => {
                    return (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => {
                          setSelectedUnit(unit);
                          setSelectedUnitSection('certifications');
                          setUnitRecordsPage(0);
                          setUnitRecordSearch('');
                          setUnitDetail({ procedures: [], certifications: [], licenses: [] });
                          setUnitDetailLoaded(emptyUnitDetailLoaded);
                          setUnitDetailLoading(false);
                          router.push(dashboardUrl({ view: 'unit-detail', unitId: unit.id }), { scroll: false });
                          setCurrentView('unit-detail');
                        }}
                        className="group flex h-full w-full min-h-0"
                      >
                        <Card
                          hover
                          className="grid h-full w-full place-items-center border-border-light bg-surface p-3 text-center transition-transform duration-200 group-hover:-translate-y-0.5"
                        >
                          <h3 className="line-clamp-2 m-0 w-full text-balance text-center font-heading text-xs font-semibold leading-snug text-charcoal sm:text-sm">
                            {unit.attributes.name}
                          </h3>
                        </Card>
                      </button>
                    );
                  })}
                </div>
              </div>
              {!unitsLoading && <PaginationControls page={unitsPage} pageCount={totalUnitPages} onPageChange={setUnitsPage} />}
            </div>
          )}

          {currentView === 'unit-detail' && selectedUnit && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <BackTitle title={selectedUnit.attributes.name} onBack={() => {
                router.push(dashboardUrl({ view: 'operational-units' }), { scroll: false });
                setCurrentView('operational-units');
              }} />
              <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-2 sm:items-center sm:py-0">
                <div className="grid w-full max-w-5xl grid-cols-1 gap-4 self-center sm:grid-cols-2 lg:grid-cols-3">
                  {unitSections.map((section) => (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => {
                        setSelectedUnitSection(section.key);
                        setUnitRecordSearch('');
                        setUnitRecordsPage(0);
                        void loadUnitSection(section.key);
                        router.push(dashboardUrl({ view: 'unit-records', unitId: selectedUnit.id, section: section.key }), { scroll: false });
                        setCurrentView('unit-records');
                      }}
                      className="group h-full text-left"
                    >
                      <Card
                        hover
                        className="flex h-full min-h-[10rem] border-border-light bg-surface transition-transform duration-200 group-hover:-translate-y-1 sm:min-h-[11rem]"
                      >
                        <CardContent className="flex h-full flex-col items-center justify-center p-4 text-center sm:p-5">
                          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12">
                            {section.icon}
                          </span>
                          <h3 className="mt-3 font-heading text-lg font-semibold text-charcoal sm:mt-4 sm:text-xl">{section.title}</h3>
                          <p className="mt-2 text-sm text-steel">{section.description}</p>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentView === 'unit-records' && selectedUnit && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <BackTitle title={`${selectedUnit.attributes.name} ${selectedUnitSectionData.title}`} onBack={() => {
                router.push(dashboardUrl({ view: 'unit-detail', unitId: selectedUnit.id }), { scroll: false });
                setCurrentView('unit-detail');
              }} />
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-light bg-surface shadow-sm">
                <div className="flex flex-shrink-0 flex-col gap-3 border-b border-border-light px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {selectedUnitSectionData.icon}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-heading text-base font-semibold text-charcoal">{selectedUnitSectionData.title}</h3>
                      <p className="text-xs text-steel">{selectedUnitSectionData.description}</p>
                    </div>
                  </div>
                  <label className="relative block w-full sm:w-56">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
                    <input
                      className="input h-9 w-full pl-9"
                      value={unitRecordSearch}
                      onChange={(event) => {
                        setUnitRecordSearch(event.target.value);
                        setUnitRecordsPage(0);
                      }}
                      placeholder="Search"
                    />
                  </label>
                </div>
                <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                  {unitDetailLoading ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-steel">Loading records…</div>
                  ) : filteredUnitRecords.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-steel">No records available.</div>
                  ) : selectedUnitSection === 'procedures' ? (
                    <DocumentTable
                      title={selectedUnitSectionData.title}
                      subtitle={selectedUnitSectionData.description}
                      documents={filteredUnitProcedures}
                      loading={false}
                      emptyText="No procedure records available."
                      page={Math.min(unitRecordsPage, unitProceduresPageCount - 1)}
                      onPageChange={setUnitRecordsPage}
                      variant="operationalProcedure"
                      searchTerm={unitRecordSearch}
                      onSearchChange={setUnitRecordSearch}
                      onPreviewFile={setPreviewFile}
                      hideHeader
                    />
                  ) : selectedUnitSection === 'certifications' ? (
                    <VisitorTableScroll
                      page={unitRecordsPage}
                      pageCount={unitCertificationsPageCount}
                      onPageChange={setUnitRecordsPage}
                      header={
                        <div className="grid grid-cols-[1.15fr_0.8fr_0.8fr_0.65fr_0.65fr_0.65fr_0.7fr] gap-3 border-b border-border-light px-3 py-3 text-xs font-semibold uppercase tracking-wide text-steel sm:px-4">
                          <span>Name</span>
                          <span>Issuer</span>
                          <span>Certificate Number</span>
                          <span>Issued</span>
                          <span>Expires</span>
                          <span>Status</span>
                          <span className="text-center">Actions</span>
                        </div>
                      }
                    >
                      <div className="divide-y divide-border-light">
                        {pagedUnitCertifications.map((cert) => {
                          const file = cert.attributes.document?.data ? fileFromDocument(cert.attributes.document.data) : null;
                          return (
                            <div key={cert.id} className="grid grid-cols-[1.15fr_0.8fr_0.8fr_0.65fr_0.65fr_0.65fr_0.7fr] items-center gap-3 px-3 py-3 text-sm sm:px-4">
                              <span className="truncate font-medium text-charcoal">{cert.attributes.name}</span>
                              <span className="truncate text-steel">{cert.attributes.issuer || '-'}</span>
                              <span className="truncate text-steel">{cert.attributes.certificateNo || '-'}</span>
                              <span className="truncate text-steel">{formatDate(cert.attributes.issuedDate)}</span>
                              <span className="truncate text-steel">{formatDate(cert.attributes.expiryDate)}</span>
                              <span className="truncate text-steel">{visitorCertificateLicenseStatusDisplay(cert.attributes.status)}</span>
                              <div className="flex items-center justify-center gap-2">
                                {cert.attributes.externalLink && (
                                  <a href={cert.attributes.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-light text-primary hover:bg-light">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                                {file?.url && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewFile({ ...file, title: cert.attributes.name })}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-light text-primary hover:bg-light"
                                    aria-label={`Preview attachment for ${cert.attributes.name}`}
                                  >
                                    <Paperclip className="h-4 w-4" />
                                  </button>
                                )}
                                {!cert.attributes.externalLink && !file?.url && <span className="text-xs text-steel">-</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </VisitorTableScroll>
                  ) : (
                    <VisitorTableScroll
                      page={unitRecordsPage}
                      pageCount={unitLicensesPageCount}
                      onPageChange={setUnitRecordsPage}
                      header={
                        <div className="grid grid-cols-[1.2fr_0.85fr_0.85fr_0.7fr_0.7fr_0.65fr_0.75fr] gap-3 border-b border-border-light px-3 py-3 text-xs font-semibold uppercase tracking-wide text-steel sm:px-4">
                          <span>Name</span>
                          <span>Authority</span>
                          <span>License Number</span>
                          <span>Issued</span>
                          <span>Expires</span>
                          <span>Status</span>
                          <span className="text-center">Actions</span>
                        </div>
                      }
                    >
                      <div className="divide-y divide-border-light">
                        {pagedUnitLicenses.map((license) => {
                          const file = license.attributes.document?.data ? fileFromDocument(license.attributes.document.data) : null;
                          return (
                            <div key={license.id} className="grid grid-cols-[1.2fr_0.85fr_0.85fr_0.7fr_0.7fr_0.65fr_0.75fr] items-center gap-3 px-3 py-3 text-sm sm:px-4">
                              <span className="truncate font-medium text-charcoal">{license.attributes.name}</span>
                              <span className="truncate text-steel">{license.attributes.authority || '-'}</span>
                              <span className="truncate text-steel">{license.attributes.licenseNo || '-'}</span>
                              <span className="truncate text-steel">{formatDate(license.attributes.issuedDate)}</span>
                              <span className="truncate text-steel">{formatDate(license.attributes.expiryDate)}</span>
                              <span className="truncate text-steel">{visitorCertificateLicenseStatusDisplay(license.attributes.status)}</span>
                              <div className="flex items-center justify-center gap-2">
                                {license.attributes.externalLink && (
                                  <a href={license.attributes.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-light text-primary hover:bg-light">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                                {file?.url && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewFile({ ...file, title: license.attributes.name })}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-light text-primary hover:bg-light"
                                    aria-label={`Preview attachment for ${license.attributes.name}`}
                                  >
                                    <Paperclip className="h-4 w-4" />
                                  </button>
                                )}
                                {!license.attributes.externalLink && !file?.url && <span className="text-xs text-steel">-</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </VisitorTableScroll>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <AttachmentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
