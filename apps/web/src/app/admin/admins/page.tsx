'use client';

import { Shield, Plus, Pencil, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, StatusBadge } from '@/components/ui';
import { AccessDenied } from '@/components/admin/AccessDenied';
import {
  adminAdminsList,
  adminAdminCreate,
  adminAdminUpdate,
  type AdminListItem,
} from '@/lib/admin-api';

export default function AdminAdminsPage() {
  const router = useRouter();
  const [list, setList] = useState<AdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('ADMIN');
  const [formStatus, setFormStatus] = useState('ACTIVE');

  const fetchList = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const res = await fetch('/api/admin/admins', { credentials: 'include', cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (res.status === 403) {
        setAccessDenied(true);
        setList([]);
        return;
      }
      const data = await res.json();
      setList(data.data ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreateModal = () => {
    setEditId(null);
    setFormEmail('');
    setFormName('');
    setFormPassword('');
    setFormRole('ADMIN');
    setFormStatus('ACTIVE');
    setModalOpen(true);
  };

  const openEditModal = (admin: AdminListItem) => {
    setEditId(admin.id);
    setFormEmail(admin.email);
    setFormName(admin.name ?? '');
    setFormPassword('');
    setFormRole(admin.role);
    setFormStatus(admin.status);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await adminAdminUpdate(editId, {
          name: formName || undefined,
          role: formRole,
          status: formStatus,
        });
        showToast('success', 'Admin updated.');
      } else {
        if (!formPassword || formPassword.length < 8) {
          showToast('error', 'Password must be at least 8 characters.');
          setSaving(false);
          return;
        }
        await adminAdminCreate({
          email: formEmail.trim(),
          name: formName.trim() || undefined,
          temporaryPassword: formPassword,
          role: formRole,
        });
        showToast('success', 'Admin created. Share the temporary password securely.');
      }
      setModalOpen(false);
      fetchList();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (admin: AdminListItem) => {
    if (!confirm(`Disable admin access for ${admin.email}? They will no longer be able to sign in.`)) return;
    setSaving(true);
    try {
      await adminAdminUpdate(admin.id, { status: 'INACTIVE' });
      showToast('success', 'Admin access disabled.');
      fetchList();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to disable.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AccessDenied
          title="You don't have access to this page"
          description="Only Super Admins can view and manage admin users. Contact a Super Admin if you need access."
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
            <Shield className="h-8 w-8 text-primary" />
            Admins
          </h1>
          <p className="mt-1 text-steel">
            Manage admin users. Only SUPER_ADMIN can create or change admins.
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Admin
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>List</CardTitle>
          <span className="text-sm text-steel">{list.length} admin(s)</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-steel">Loading…</div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-steel">No admins found.</div>
          ) : (
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
                  {list.map((a) => (
                    <tr key={a.id} className="border-b border-border-light">
                      <td className="py-3 pr-4 text-charcoal">{a.name || '—'}</td>
                      <td className="py-3 pr-4 text-charcoal">{a.email}</td>
                      <td className="py-3 pr-4">
                        <span className="font-medium text-charcoal">{a.role}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="py-3 pr-4 text-steel">{formatDate(a.createdAt)}</td>
                      <td className="py-3 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => openEditModal(a)}
                          disabled={saving}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        {a.status === 'ACTIVE' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-danger hover:bg-danger/10"
                            onClick={() => handleDisable(a)}
                            disabled={saving}
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Disable
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editId ? 'Edit Admin' : 'Add Admin'}</CardTitle>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-steel hover:text-charcoal"
                aria-label="Close"
              >
                ×
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-steel">Email *</label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    disabled={!!editId}
                    placeholder="admin@example.com"
                  />
                  {editId && <p className="mt-1 text-xs text-steel">Email cannot be changed.</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-steel">Name</label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Optional display name"
                  />
                </div>
                {!editId && (
                  <div>
                    <label className="mb-1 block text-sm text-steel">Temporary password * (min 8 characters)</label>
                    <Input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      required={!editId}
                      minLength={8}
                      placeholder="••••••••"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm text-steel">Role</label>
                  <select
                    className="input w-full"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    disabled={saving}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>
                {editId && (
                  <div>
                    <label className="mb-1 block text-sm text-steel">Status</label>
                    <select
                      className="input w-full"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      disabled={saving}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive (disable access)</option>
                    </select>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
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
