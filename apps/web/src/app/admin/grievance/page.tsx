'use client';

import { AlertCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Pagination, StatusBadge } from '@/components/ui';

interface GrievanceAttributes {
  caseNo: string;
  status: 'OPEN' | 'IN_REVIEW' | 'CLOSED';
  category: string | null;
  receivedDate: string;
  publicSummary: string | null;
}

interface GrievanceItem {
  id: number;
  attributes: GrievanceAttributes;
}

interface ListResponse {
  data: GrievanceItem[];
  meta?: { pagination?: { page: number; pageCount: number; total: number } };
}

export default function AdminGrievancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch(`/api/admin/grievances?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const data = await res.json();
      setList(data);
    } catch {
      setList({ data: [] });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, router]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (statusFilter) params.set('status', statusFilter);
    router.push(`/admin/grievance?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/admin/grievance?${params.toString()}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this grievance case?')) return;
    setDeleteId(id);
    try {
      const res = await fetch(`/api/admin/grievances/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (res.ok) fetchList();
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-h1 text-charcoal flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-primary" />
            Grievance
          </h1>
          <p className="mt-1 text-steel">Manage grievance cases.</p>
        </div>
        <Link href="/admin/grievance/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>New Grievance Case</Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-sm text-steel">Status</label>
              <select
                className="input min-w-[140px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="CLOSED">Closed</option>
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
          {loading ? (
            <div className="py-12 text-center text-steel">Loading…</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-steel">No grievance cases found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-medium text-steel">
                      <th className="pb-3 pr-4 font-medium">Case No</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Category</th>
                      <th className="pb-3 pr-4 font-medium">Received</th>
                      <th className="pb-3 pr-4 font-medium">Summary</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((g) => (
                      <tr key={g.id} className="border-b border-border-light">
                        <td className="py-3 pr-4 font-medium text-charcoal">{g.attributes.caseNo}</td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={g.attributes.status} />
                        </td>
                        <td className="py-3 pr-4 text-steel">{g.attributes.category || '—'}</td>
                        <td className="py-3 pr-4 text-steel">{formatDate(g.attributes.receivedDate)}</td>
                        <td className="py-3 pr-4 text-steel max-w-[200px] truncate">
                          {g.attributes.publicSummary || '—'}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/grievance/${g.id}`}>
                              <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              onClick={() => handleDelete(g.id)}
                              disabled={deleteId === g.id}
                              className="text-danger hover:bg-danger/10"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
