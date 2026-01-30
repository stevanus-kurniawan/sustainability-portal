'use client';

import { Scale, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Pagination, StatusBadge } from '@/components/ui';

interface LicenseAttributes {
  name: string;
  authority: string;
  licenseNo: string;
  issuedDate: string | null;
  expiryDate: string | null;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
}

interface LicenseItem {
  id: number;
  attributes: LicenseAttributes;
}

interface ListResponse {
  data: LicenseItem[];
  meta?: { pagination?: { page: number; pageCount: number; total: number } };
}

export default function AdminLicensesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    try {
      const res = await fetch(`/api/admin/licenses?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
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
  }, [page, search, statusFilter, router]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    router.push(`/admin/licenses?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/admin/licenses?${params.toString()}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this license?')) return;
    setDeleteId(id);
    try {
      const res = await fetch(`/api/admin/licenses/${id}`, {
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
  const licenses = list?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-h1 text-charcoal flex items-center gap-2">
            <Scale className="h-8 w-8 text-primary" />
            Licenses
          </h1>
          <p className="mt-1 text-steel">Manage compliance licenses.</p>
        </div>
        <Link href="/admin/licenses/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>New License</Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
              <label className="mb-1 block text-sm text-steel">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
                <Input
                  className="pl-9"
                  placeholder="Name, authority, license no..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-steel">Status</label>
              <select
                className="input min-w-[140px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRING">Expiring</option>
                <option value="EXPIRED">Expired</option>
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
          ) : licenses.length === 0 ? (
            <div className="py-12 text-center text-steel">No licenses found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-medium text-steel">
                      <th className="pb-3 pr-4 font-medium">Name</th>
                      <th className="pb-3 pr-4 font-medium">Authority</th>
                      <th className="pb-3 pr-4 font-medium">License No</th>
                      <th className="pb-3 pr-4 font-medium">Issued</th>
                      <th className="pb-3 pr-4 font-medium">Expires</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.map((lic) => (
                      <tr key={lic.id} className="border-b border-border-light">
                        <td className="py-3 pr-4 font-medium text-charcoal">{lic.attributes.name}</td>
                        <td className="py-3 pr-4 text-steel">{lic.attributes.authority || '—'}</td>
                        <td className="py-3 pr-4 text-steel">{lic.attributes.licenseNo || '—'}</td>
                        <td className="py-3 pr-4 text-steel">{formatDate(lic.attributes.issuedDate)}</td>
                        <td className="py-3 pr-4 text-steel">{formatDate(lic.attributes.expiryDate)}</td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={lic.attributes.status} />
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/licenses/${lic.id}`}>
                              <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              onClick={() => handleDelete(lic.id)}
                              disabled={deleteId === lic.id}
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
