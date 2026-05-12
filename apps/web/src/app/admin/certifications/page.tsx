'use client';

import { Award, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Pagination, StatusBadge } from '@/components/ui';

interface CertificationAttributes {
  name: string;
  issuer: string;
  certificateNo: string;
  issuedDate: string | null;
  expiryDate: string | null;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
  categoryId?: number | null;
  subContentId?: number | null;
  category?: { data: { id: number; attributes: { name: string; slug: string } } | null };
  subContent?: { data: { id: number; attributes: { title: string; slug: string } } | null };
  operationalUnit?: { data: { id: number; attributes: { name: string; slug: string } } | null };
}

interface CertificationItem {
  id: number;
  attributes: CertificationAttributes;
}

interface ListResponse {
  data: CertificationItem[];
  meta?: { pagination?: { page: number; pageCount: number; total: number } };
}

export default function AdminCertificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [issuerFilter, setIssuerFilter] = useState(searchParams.get('issuer') || '');
  const [issuerOptions, setIssuerOptions] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    params.set('contentVersion', 'V2');
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (issuerFilter) params.set('issuer', issuerFilter);
    try {
      const res = await fetch(`/api/admin/certifications?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
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
  }, [page, search, statusFilter, issuerFilter, router]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetch('/api/admin/certifications/issuers?contentVersion=V2', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => {
        if (res.status === 401) {
          router.replace('/admin/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        const issuers = Array.isArray(data?.data)
          ? data.data
              .map((item: { issuer?: string }) => item.issuer)
              .filter((issuer: unknown): issuer is string => typeof issuer === 'string' && issuer.trim().length > 0)
          : [];
        setIssuerOptions(issuers);
      })
      .catch(() => setIssuerOptions([]));
  }, [router]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (issuerFilter) params.set('issuer', issuerFilter);
    router.push(`/admin/certifications?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/admin/certifications?${params.toString()}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this certification?')) return;
    setDeleteId(id);
    try {
      const res = await fetch(`/api/admin/certifications/${id}`, {
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
  const certifications = list?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-h1 text-charcoal flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" />
            Certifications
          </h1>
          <p className="mt-1 text-steel">Manage sustainability certifications.</p>
        </div>
        <Link href="/admin/certifications/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>New Certification</Button>
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
                  placeholder="Name, issuer, cert no..."
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
            <div>
              <label className="mb-1 block text-sm text-steel">Issuer</label>
              <select
                className="input min-w-[180px]"
                value={issuerFilter}
                onChange={(e) => setIssuerFilter(e.target.value)}
              >
                <option value="">All</option>
                {issuerOptions.map((issuer) => (
                  <option key={issuer} value={issuer}>
                    {issuer}
                  </option>
                ))}
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
          {pagination && (
            <span className="text-sm text-steel">
              {pagination.total} total
            </span>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-steel">Loading…</div>
          ) : certifications.length === 0 ? (
            <div className="py-12 text-center text-steel">No certifications found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-medium text-steel">
                      <th className="pb-3 pr-4 font-medium">Name</th>
                      <th className="pb-3 pr-4 font-medium">Operational Unit</th>
                      <th className="pb-3 pr-4 font-medium">Issuer</th>
                      <th className="pb-3 pr-4 font-medium">Cert No</th>
                      <th className="pb-3 pr-4 font-medium">Issued</th>
                      <th className="pb-3 pr-4 font-medium">Expires</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certifications.map((cert) => (
                      <tr key={cert.id} className="border-b border-border-light">
                        <td className="py-3 pr-4 font-medium text-charcoal">{cert.attributes.name}</td>
                        <td className="py-3 pr-4 text-steel">
                          {cert.attributes.operationalUnit?.data?.attributes?.name ?? '—'}
                        </td>
                        <td className="py-3 pr-4 text-steel">{cert.attributes.issuer || '—'}</td>
                        <td className="py-3 pr-4 text-steel">{cert.attributes.certificateNo || '—'}</td>
                        <td className="py-3 pr-4 text-steel">{formatDate(cert.attributes.issuedDate)}</td>
                        <td className="py-3 pr-4 text-steel">{formatDate(cert.attributes.expiryDate)}</td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={cert.attributes.status} />
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/certifications/${cert.id}`}>
                              <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              onClick={() => handleDelete(cert.id)}
                              disabled={deleteId === cert.id}
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
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
