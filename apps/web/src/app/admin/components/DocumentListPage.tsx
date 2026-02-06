'use client';

import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Pagination, StatusBadge } from '@/components/ui';
import {
  adminDocumentsList,
  adminDocumentDelete,
  type DocumentItem,
  type ListResponse,
} from '@/lib/admin-api';

interface DocumentListPageProps {
  title: string;
  description?: string;
  type: 'POLICY' | 'GENERAL';
  categorySlug?: string;
  categoryId?: number;
  subContentId?: number;
  createHref: string;
  editHref: (id: number) => string;
  listKey?: string;
}

export function DocumentListPage({
  title,
  description,
  type,
  categorySlug,
  categoryId: categoryIdProp,
  subContentId: subContentIdProp,
  createHref,
  editHref,
  listKey = 'documents',
}: DocumentListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [list, setList] = useState<ListResponse<DocumentItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [categoryId, setCategoryId] = useState<number | undefined>(categoryIdProp);
  const [categories, setCategories] = useState<{ id: number; slug: string; mode?: string }[]>([]);
  const [categoriesFetched, setCategoriesFetched] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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
  }, [page, type, search, statusFilter, categoryId, categoryIdProp, subContentIdProp, router]);

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
    (type === 'GENERAL' && (subContentIdProp != null || !categorySlug || effectiveCategoryId != null));

  useEffect(() => {
    if (!shouldFetchList) return;
    fetchList();
  }, [fetchList, shouldFetchList]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
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
            <Button variant="secondary" onClick={applyFilters}>
              Apply
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>List</CardTitle>
          {pagination && <span className="text-sm text-steel">{pagination.total} total</span>}
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
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-medium text-steel">
                      <th className="pb-3 pr-4 font-medium">Title</th>
                      {showSubContentColumn && <th className="pb-3 pr-4 font-medium">Sub-content</th>}
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Updated</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((doc) => {
                      const subContentTitle = doc.attributes.subContent?.data?.attributes?.title ?? null;
                      return (
                      <tr key={doc.id} className="border-b border-border-light">
                        <td className="py-3 pr-4 font-medium text-charcoal">{doc.attributes.title}</td>
                        {showSubContentColumn && (
                          <td className="py-3 pr-4 text-steel">{subContentTitle ?? '—'}</td>
                        )}
                        <td className="py-3 pr-4">
                          <StatusBadge status={doc.attributes.isPublished ? 'Published' : 'Draft'} />
                        </td>
                        <td className="py-3 pr-4 text-steel">{formatDate(doc.attributes.createdAt)}</td>
                        <td className="py-3 text-right">
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
