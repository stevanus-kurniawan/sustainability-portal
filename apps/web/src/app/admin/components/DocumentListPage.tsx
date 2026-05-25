'use client';

import { FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Pagination,
  StatusBadge,
  ViewModeToggle,
  getStoredViewMode,
  type ViewMode,
} from '@/components/ui';
import {
  adminDocumentsList,
  adminDocumentDelete,
  adminOperationalUnitsList,
  type DocumentItem,
  type ListResponse,
  type OperationalUnitItem,
} from '@/lib/admin-api';

interface DocumentListPageProps {
  title: string;
  description?: string;
  type: 'POLICY' | 'GRIEVANCE' | 'GENERAL';
  categorySlug?: string;
  categoryId?: number;
  subContentId?: number;
  contentVersion?: 'V1' | 'V2';
  policyKind?: 'SOP' | 'FORM';
  regulationKind?: 'NATIONAL' | 'INTERNATIONAL';
  regulationOnly?: boolean;
  procedureScope?: 'SUSTAINABILITY' | 'OPERATIONAL_UNIT';
  procedureOnly?: boolean;
  updateOnly?: boolean;
  operationalUnitId?: number;
  createHref: string;
  editHref: (id: number) => string;
  listKey?: string;
  /** When set with policy/SOP type, enables table/grid view toggle (table default). */
  viewModeStorageKey?: string;
}

export function DocumentListPage({
  title,
  description,
  type,
  categorySlug,
  categoryId: categoryIdProp,
  subContentId: subContentIdProp,
  contentVersion,
  policyKind,
  regulationKind,
  regulationOnly,
  procedureScope,
  procedureOnly,
  updateOnly,
  operationalUnitId,
  createHref,
  editHref,
  listKey = 'documents',
  viewModeStorageKey,
}: DocumentListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [list, setList] = useState<ListResponse<DocumentItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [procedureTypeFilter, setProcedureTypeFilter] = useState(searchParams.get('documentType') || '');
  const [operationalUnitFilter, setOperationalUnitFilter] = useState(searchParams.get('operationalUnitId') || '');
  const [categoryId, setCategoryId] = useState<number | undefined>(categoryIdProp);
  const [categories, setCategories] = useState<{ id: number; slug: string; mode?: string }[]>([]);
  const [categoriesFetched, setCategoriesFetched] = useState(false);
  const [operationalUnits, setOperationalUnits] = useState<OperationalUnitItem[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  useEffect(() => {
    if (viewModeStorageKey) setViewMode(getStoredViewMode(viewModeStorageKey));
  }, [viewModeStorageKey]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories', { credentials: 'include', cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.data ?? [];
      setCategories(
        arr.map((c: { id: number; attributes?: { slug: string; mode?: string }; slug?: string; mode?: string }) => ({
          id: c.id,
          slug: c.attributes?.slug ?? (c as { slug: string }).slug ?? '',
          mode: c.attributes?.mode ?? (c as { mode?: string }).mode,
        }))
      );
      if (categorySlug && !categoryIdProp) {
        const slugLower = categorySlug.toLowerCase();
        const found = arr.find(
          (c: { id: number; attributes?: { slug: string }; slug?: string }) => {
            const s = (c.attributes?.slug ?? c.slug) ?? '';
            return s.toLowerCase() === slugLower;
          }
        );
        if (found) setCategoryId(found.id);
      }
    } catch {
      // ignore
    } finally {
      setCategoriesFetched(true);
    }
  }, [categorySlug, categoryIdProp, router]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof adminDocumentsList>[0] = {
        page,
        pageSize: 20,
        type,
        search: search || undefined,
        categoryId: categoryId ?? categoryIdProp ?? undefined,
        subContentId: subContentIdProp,
        contentVersion,
        policyKind,
        regulationKind,
        documentType: procedureOnly && procedureTypeFilter ? procedureTypeFilter : undefined,
        regulationOnly,
        procedureScope,
        procedureOnly,
        updateOnly,
        operationalUnitId: operationalUnitFilter ? parseInt(operationalUnitFilter, 10) : operationalUnitId,
      };
      if (statusFilter === 'published') params.isPublished = true;
      if (statusFilter === 'draft') params.isPublished = false;
      const data = await adminDocumentsList(params);
      setList(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'Unauthorized' || msg.includes('401')) {
        router.replace('/admin/login');
        return;
      }
      setList({ data: [] });
    } finally {
      setLoading(false);
    }
  }, [page, type, search, statusFilter, categoryId, categoryIdProp, subContentIdProp, contentVersion, policyKind, regulationKind, procedureTypeFilter, regulationOnly, procedureScope, procedureOnly, updateOnly, operationalUnitId, operationalUnitFilter, router]);

  useEffect(() => {
    if (type === 'GENERAL' && (categorySlug || categoryIdProp != null)) {
      fetchCategories();
    }
  }, [type, categorySlug, categoryIdProp, fetchCategories]);

  const effectiveCategoryId = categoryId ?? categoryIdProp;
  const selectedCategory = effectiveCategoryId != null ? categories.find((c) => c.id === effectiveCategoryId) : null;
  const showSubContentColumn = selectedCategory?.mode === 'WITH_SUBCONTENT';
  const shouldFetchList =
    type === 'POLICY' ||
    type === 'GRIEVANCE' ||
    (type === 'GENERAL' && (subContentIdProp != null || !categorySlug || effectiveCategoryId != null));

  useEffect(() => {
    if (!shouldFetchList) return;
    fetchList();
  }, [fetchList, shouldFetchList]);

  useEffect(() => {
    if (!procedureOnly) return;
    let cancelled = false;
    adminOperationalUnitsList()
      .then((data) => {
        if (!cancelled) setOperationalUnits(data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setOperationalUnits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [procedureOnly]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (procedureOnly && procedureTypeFilter) params.set('documentType', procedureTypeFilter);
    if (procedureOnly && operationalUnitFilter) params.set('operationalUnitId', operationalUnitFilter);
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`?${params.toString()}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    setDeleteId(id);
    try {
      await adminDocumentDelete(id);
      fetchList();
    } catch {
      // show error in UI if needed
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const pagination = list?.meta?.pagination;
  const totalPages = pagination?.pageCount ?? 1;
  const items = list?.data ?? [];

  const showList = type !== 'GENERAL' || !categorySlug || effectiveCategoryId != null;

  const normalizedCategorySlug = categorySlug?.toLowerCase() ?? '';
  const isPolicy = type === 'POLICY';
  const isSop = type === 'GENERAL' && categorySlug === 'sop';
  const showUpdateColumns = Boolean(updateOnly);
  const showProcedurePlantColumn = Boolean(procedureOnly);
  const showMappedColumns =
    isPolicy ||
    isSop ||
    procedureOnly ||
    regulationOnly ||
    type === 'GRIEVANCE' ||
    ['sustainability-report', 'standard'].includes(normalizedCategorySlug);
  const mappedColumnLabels =
    type === 'GRIEVANCE'
      ? ['Reference Number', 'Status', null, 'Submitted Date']
      : normalizedCategorySlug === 'sustainability-report'
        ? ['Period', 'Scope', 'Version', 'Publish Date']
        : regulationOnly
          ? ['Code', 'Jurisdiction', 'Version', 'Effective Date']
          : normalizedCategorySlug === 'standard'
            ? ['Code', 'Body', 'Version', 'Effective Date']
            : ['Code', 'Type', 'Version', 'Effective Date'];
  const showPolicySopColumns = showMappedColumns;
  const showViewToggle = Boolean(viewModeStorageKey && showPolicySopColumns);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-h1 text-charcoal">{title}</h1>
          {description && <p className="mt-1 text-steel text-sm">{description}</p>}
        </div>
        <Link href={createHref}>
          <Button leftIcon={<Plus className="h-4 w-4" />}>New</Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
              <label className="mb-1 block text-sm text-steel">Search by title</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
                <Input
                  className="pl-9"
                  placeholder="Title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-steel">Status</label>
              <select
                className="input min-w-[140px] rounded-md border border-border-light px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            {procedureOnly && (
              <>
                <div>
                  <label className="mb-1 block text-sm text-steel">Type</label>
                  <select
                    className="input min-w-[140px] rounded-md border border-border-light px-3 py-2 text-sm"
                    value={procedureTypeFilter}
                    onChange={(e) => setProcedureTypeFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="SOP">SOP</option>
                    <option value="FORM">Form</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-steel">Operational Unit</label>
                  <select
                    className="input min-w-[180px] rounded-md border border-border-light px-3 py-2 text-sm"
                    value={operationalUnitFilter}
                    onChange={(e) => setOperationalUnitFilter(e.target.value)}
                    disabled={operationalUnitId != null}
                  >
                    <option value="">All</option>
                    {operationalUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.attributes.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <Button variant="secondary" onClick={applyFilters}>
              Apply
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>List</CardTitle>
          <div className="flex items-center gap-4">
            {pagination && <span className="text-sm text-steel">{pagination.total} total</span>}
            {showViewToggle && (
              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                storageKey={viewModeStorageKey}
                ariaLabel={`${title} view`}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {type === 'GENERAL' && categorySlug && !effectiveCategoryId && categoriesFetched ? (
            <div className="py-12 text-center text-steel">
              <p>Category &quot;{categorySlug}&quot; not found.</p>
              <p className="mt-2 text-sm">Create a category with this slug in Admin to filter documents here.</p>
            </div>
          ) : !showList ? (
            <div className="py-12 text-center text-steel">Loading…</div>
          ) : loading ? (
            <div className="py-12 text-center text-steel">Loading…</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-steel">No items found.</div>
          ) : showViewToggle && viewMode === 'grid' ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((doc) => (
                  <SopDocCard
                    key={doc.id}
                    doc={doc}
                    formatDate={formatDate}
                    editHref={editHref(doc.id)}
                    onDelete={() => handleDelete(doc.id)}
                    isDeleting={deleteId === doc.id}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              )}
            </>
          ) : (
            <>
              <div
                className={
                  showViewToggle
                    ? 'overflow-x-auto rounded-lg border border-border-light'
                    : 'overflow-x-auto'
                }
              >
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr
                      className={
                        showViewToggle
                          ? 'border-b border-border-light bg-lighter'
                          : 'border-b border-border-medium text-steel'
                      }
                    >
                      <th className={showViewToggle ? 'py-3 px-4 font-semibold text-charcoal' : 'pb-3 pr-4 font-medium'}>
                        Title
                      </th>
                      {showUpdateColumns ? (
                        <>
                          <th className="pb-3 pr-4 font-medium">Description</th>
                          <th className="pb-3 pr-4 font-medium">Date</th>
                        </>
                      ) : showPolicySopColumns && showViewToggle ? (
                        <>
                          <th className="py-3 px-4 font-semibold text-charcoal">{mappedColumnLabels[0]}</th>
                          <th className="py-3 px-4 font-semibold text-charcoal">{mappedColumnLabels[1]}</th>
                          {showProcedurePlantColumn && <th className="py-3 px-4 font-semibold text-charcoal">Plant</th>}
                          {mappedColumnLabels[2] && <th className="py-3 px-4 font-semibold text-charcoal">{mappedColumnLabels[2]}</th>}
                          <th className="py-3 px-4 font-semibold text-charcoal">{mappedColumnLabels[3]}</th>
                        </>
                      ) : showPolicySopColumns ? (
                        <>
                          <th className="pb-3 pr-4 font-medium">{mappedColumnLabels[0]}</th>
                          <th className="pb-3 pr-4 font-medium">{mappedColumnLabels[1]}</th>
                          {showProcedurePlantColumn && <th className="pb-3 pr-4 font-medium">Plant</th>}
                          {mappedColumnLabels[2] && <th className="pb-3 pr-4 font-medium">{mappedColumnLabels[2]}</th>}
                          <th className="pb-3 pr-4 font-medium">{mappedColumnLabels[3]}</th>
                        </>
                      ) : (
                        showSubContentColumn && <th className="pb-3 pr-4 font-medium">Sub-content</th>
                      )}
                      {!showViewToggle && (
                        <>
                          <th className="pb-3 pr-4 font-medium">Status</th>
                          <th className="pb-3 pr-4 font-medium">Updated</th>
                        </>
                      )}
                      <th className={showViewToggle ? 'py-3 px-4 font-semibold text-charcoal text-right' : 'pb-3 font-medium text-right'}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((doc) => {
                      const subContentTitle = doc.attributes.subContent?.data?.attributes?.title ?? null;
                      const extended = doc.attributes as unknown as {
                        code?: string | null;
                        documentType?: string | null;
                        versionLabel?: string | null;
                        effectiveDate?: string | null;
                        policyKind?: string | null;
                        regulationKind?: string | null;
                        procedureScope?: string | null;
                      };
                      const currentVersion = (doc.attributes.currentVersion as {
                        data?: { attributes?: { versionNo?: number | null; validFrom?: string | null } } | null;
                      } | null)?.data;
                      const versionNo = currentVersion?.attributes?.versionNo ?? null;
                      const effectiveFrom = currentVersion?.attributes?.validFrom ?? null;
                      const displayCode = extended.code ?? '—';
                      const displayType =
                        showMappedColumns
                          ? (extended.documentType ?? '—')
                          : (extended.policyKind ?? extended.regulationKind ?? extended.procedureScope ?? extended.documentType ?? doc.attributes.type ?? '—');
                      const displayVersion =
                        extended.versionLabel ?? (versionNo != null ? String(versionNo) : '—');
                      const displayEffectiveDate = formatDate(extended.effectiveDate ?? effectiveFrom ?? null);
                      const displayPlant = doc.attributes.operationalUnit?.data?.attributes?.name ?? '—';
                      return (
                        <tr
                          key={doc.id}
                          className={
                            showViewToggle
                              ? 'border-b border-border-light last:border-0 hover:bg-lighter/50'
                              : 'border-b border-border-light'
                          }
                        >
                          <td className={showViewToggle ? 'py-3 px-4 font-medium text-charcoal' : 'py-3 pr-4 font-medium text-charcoal'}>
                            {doc.attributes.title || '—'}
                          </td>
                          {showUpdateColumns ? (
                            <>
                              <td className="py-3 pr-4 text-steel">
                                <span className="line-clamp-2">{doc.attributes.description || '—'}</span>
                              </td>
                              <td className="py-3 pr-4 text-steel">{displayEffectiveDate}</td>
                            </>
                          ) : showPolicySopColumns ? (
                            <>
                              <td className={showViewToggle ? 'py-3 px-4 text-steel' : 'py-3 pr-4 text-steel'}>
                                {displayCode}
                              </td>
                              <td className={showViewToggle ? 'py-3 px-4 text-steel' : 'py-3 pr-4 text-steel'}>
                                {type === 'GRIEVANCE' ? (
                                  <StatusBadge status={displayType} />
                                ) : (
                                  displayType
                                )}
                              </td>
                              {showProcedurePlantColumn && (
                                <td className={showViewToggle ? 'py-3 px-4 text-steel' : 'py-3 pr-4 text-steel'}>
                                  {displayPlant}
                                </td>
                              )}
                              {mappedColumnLabels[2] && (
                                <td className={showViewToggle ? 'py-3 px-4 text-steel' : 'py-3 pr-4 text-steel'}>
                                  {displayVersion}
                                </td>
                              )}
                              <td className={showViewToggle ? 'py-3 px-4 text-steel' : 'py-3 pr-4 text-steel'}>
                                {displayEffectiveDate}
                              </td>
                            </>
                          ) : (
                            showSubContentColumn && (
                              <td className="py-3 pr-4 text-steel">{subContentTitle ?? '—'}</td>
                            )
                          )}
                          {!showViewToggle && (
                            <>
                              <td className="py-3 pr-4">
                                <StatusBadge status={doc.attributes.isPublished ? 'Published' : 'Draft'} />
                              </td>
                              <td className="py-3 pr-4 text-steel">{formatDate(doc.attributes.createdAt)}</td>
                            </>
                          )}
                          <td className={showViewToggle ? 'py-3 px-4 text-right' : 'py-3 text-right'}>
                            <div className="flex justify-end gap-2">
                              <Link href={editHref(doc.id)}>
                                <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
                                  Edit
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Trash2 className="h-4 w-4" />}
                                onClick={() => handleDelete(doc.id)}
                                disabled={deleteId === doc.id}
                                className="text-danger hover:bg-danger/10"
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SopDocCard({
  doc,
  formatDate,
  editHref,
  onDelete,
  isDeleting,
}: {
  doc: DocumentItem;
  formatDate: (date: string | null) => string;
  editHref: string;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const extended = doc.attributes as unknown as {
    code?: string | null;
    documentType?: string | null;
    versionLabel?: string | null;
    effectiveDate?: string | null;
    policyKind?: string | null;
    regulationKind?: string | null;
    procedureScope?: string | null;
  };
  const currentVersion = (doc.attributes.currentVersion as {
    data?: { attributes?: { versionNo?: number | null; validFrom?: string | null } } | null;
  } | null)?.data;
  const versionNo = currentVersion?.attributes?.versionNo ?? null;
  const effectiveFrom = currentVersion?.attributes?.validFrom ?? null;
  const displayCode = extended.code ?? '—';
  const displayType = extended.policyKind ?? extended.regulationKind ?? extended.procedureScope ?? extended.documentType ?? doc.attributes.type ?? '—';
  const displayVersion = extended.versionLabel ?? (versionNo != null ? String(versionNo) : '—');
  const displayEffectiveDate = formatDate(extended.effectiveDate ?? effectiveFrom ?? null);

  return (
    <Card hover>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-light flex items-center justify-center border border-border-light">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg font-semibold text-charcoal mb-2">
              {doc.attributes.title || '—'}
            </h3>
            <dl className="grid grid-cols-1 gap-1 text-sm text-steel mb-4">
              <div><span className="font-medium text-charcoal">Code:</span> {displayCode}</div>
              <div><span className="font-medium text-charcoal">Type:</span> {displayType}</div>
              <div><span className="font-medium text-charcoal">Version:</span> {displayVersion}</div>
              <div><span className="font-medium text-charcoal">Effective Date:</span> {displayEffectiveDate}</div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Link
                href={editHref}
                className="btn btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={onDelete}
                disabled={isDeleting}
                className="text-danger hover:bg-danger/10"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
