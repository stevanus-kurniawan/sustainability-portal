'use client';

import { Users as UsersIcon, Search, Pencil, Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Pagination, StatusBadge } from '@/components/ui';
import { AccessDenied } from '@/components/admin/AccessDenied';
import {
  adminUserCreate,
  type AdminUserListItem,
  type UserStatus,
} from '@/lib/admin-api';

const USER_STATUSES: { value: UserStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const ROLE_OPTIONS = ['USER', 'ADMIN', 'SUPER_ADMIN'];

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [list, setList] = useState<{ data: AdminUserListItem[]; meta?: { pagination?: { pageCount: number; total: number } } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('USER');
  const [formSendVerification, setFormSendVerification] = useState(true);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (roleFilter) params.set('role', roleFilter);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    try {
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (res.status === 403) {
        setAccessDenied(true);
        setList(null);
        return;
      }
      const data = await res.json();
      setList(data);
    } catch {
      setList({ data: [] });
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, roleFilter, sortBy, sortOrder, router]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (roleFilter) params.set('role', roleFilter);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    router.push(`/admin/users?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/admin/users?${params.toString()}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreateModal = () => {
    setFormEmail('');
    setFormName('');
    setFormPassword('');
    setFormRole('USER');
    setFormSendVerification(true);
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formName.trim() || !formPassword) {
      showToast('error', 'Email, name, and password are required.');
      return;
    }
    if (formPassword.length < 8) {
      showToast('error', 'Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await adminUserCreate({
        email: formEmail.trim(),
        name: formName.trim(),
        temporaryPassword: formPassword,
        roles: [formRole],
        sendVerificationEmail: formSendVerification,
      });
      showToast(
        'success',
        formSendVerification
          ? 'User created. Verification email sent.'
          : 'User created. They can log in with the password you set.',
      );
      setCreateModalOpen(false);
      fetchList();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  const pagination = list?.meta?.pagination;
  const totalPages = pagination?.pageCount ?? 1;
  const users = list?.data ?? [];

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AccessDenied
          title="You don't have access to this page"
          description="Your role doesn't have permission to view or manage users. Contact a Super Admin if you need access."
          backHref="/admin"
          backLabel="Back to Dashboard"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2 shadow-lg ${
            toast.type === 'success' ? 'bg-success/90 text-white' : 'bg-danger/90 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-h1 text-charcoal flex items-center gap-2">
            <UsersIcon className="h-8 w-8 text-primary" />
            Users
          </h1>
          <p className="mt-1 text-steel">Manage registered portal users. Create visitors or assign roles.</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Create user
        </Button>
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
                  placeholder="Name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-steel">Role</label>
              <select
                className="input min-w-[140px]"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-steel">Status</label>
              <select
                className="input min-w-[160px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                {USER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-steel">Sort</label>
              <select
                className="input min-w-[120px]"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const v = e.target.value;
                  const [by, order] = v.split('-');
                  setSortBy(by);
                  setSortOrder(order as 'asc' | 'desc');
                }}
              >
                <option value="createdAt-desc">Newest first</option>
                <option value="createdAt-asc">Oldest first</option>
                <option value="email-asc">Email A–Z</option>
                <option value="email-desc">Email Z–A</option>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
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
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-steel">No users found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-light text-steel">
                      <th className="pb-3 pr-4 font-medium">Name</th>
                      <th className="pb-3 pr-4 font-medium">Email</th>
                      <th className="pb-3 pr-4 font-medium">Role</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Created</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border-light">
                        <td className="py-3 pr-4 text-charcoal">{u.name}</td>
                        <td className="py-3 pr-4 text-charcoal">{u.email}</td>
                        <td className="py-3 pr-4">
                          <span className="text-steel">{u.roles?.join(', ') || '—'}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="py-3 pr-4 text-steel">{formatDate(u.createdAt)}</td>
                        <td className="py-3 flex flex-wrap gap-2">
                          <Link href={`/admin/users/${u.id}`}>
                            <Button variant="outline" size="sm" className="gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </Link>
                          <Link href={`/admin/users/${u.id}`}>
                            <Button variant="outline" size="sm" className="gap-1">
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </Link>
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

      {createModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Create visitor user</CardTitle>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-steel hover:text-charcoal text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-steel">Email *</label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-steel">Full name *</label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-steel">Password * (min 8 characters)</label>
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                  />
                  <p className="mt-1 text-xs text-steel">Share this password with the user securely.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-steel">Role</label>
                  <select
                    className="input w-full"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    disabled={saving}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="send-verification"
                    checked={formSendVerification}
                    onChange={(e) => setFormSendVerification(e.target.checked)}
                    disabled={saving}
                    className="rounded border-border-light"
                  />
                  <label htmlFor="send-verification" className="text-sm text-steel">
                    Send verification email (user must verify before first login)
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Creating…' : 'Create user'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateModalOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
