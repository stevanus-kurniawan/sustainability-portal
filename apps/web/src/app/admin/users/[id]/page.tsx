'use client';

import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, StatusBadge } from '@/components/ui';
import { AccessDenied } from '@/components/admin/AccessDenied';
import {
  adminUserUpdate,
  adminUserUpdateRole,
  adminUserUpdateStatus,
  adminUserUpdateEmailVerification,
  type AdminUserDetail,
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

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [name, setName] = useState('');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  const [role, setRole] = useState('USER');

  const fetchUser = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setAccessDenied(false);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { credentials: 'include', cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (res.status === 403) {
        setAccessDenied(true);
        setUser(null);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setName(data.name ?? '');
        setStatus(data.status ?? 'ACTIVE');
        setRole(Array.isArray(data.roles) && data.roles[0] ? data.roles[0] : 'USER');
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveProfile = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await adminUserUpdate(id, { name, status, roles: [role] });
      showToast('success', 'User updated.');
      fetchUser();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!id) return;
    setSaving(true);
    try {
      await adminUserUpdateRole(id, newRole);
      setRole(newRole);
      showToast('success', 'Role updated.');
      fetchUser();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Role update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: UserStatus) => {
    if (!id) return;
    setSaving(true);
    try {
      await adminUserUpdateStatus(id, newStatus);
      setStatus(newStatus);
      showToast('success', 'Status updated.');
      fetchUser();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Status update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailVerificationChange = async (emailVerified: boolean) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await adminUserUpdateEmailVerification(id, emailVerified);
      setUser(updated);
      showToast('success', emailVerified ? 'Email marked as verified.' : 'Email marked as unverified.');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Email verification update failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="py-12 text-center text-steel">Loading…</div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <AccessDenied
          title="You don't have access to this page"
          description="Your role doesn't have permission to view or edit this user. Contact a Super Admin if you need access."
          backHref="/admin/users"
          backLabel="Back to Users"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-steel">User not found.</p>
        <Link href="/admin/users" className="mt-4 inline-block text-primary hover:underline">
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/admin/users"
        className="mb-6 inline-flex items-center gap-2 text-steel hover:text-charcoal"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2 shadow-lg ${
            toast.type === 'success' ? 'bg-success/90 text-white' : 'bg-danger/90 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <h1 className="font-heading text-h1 text-charcoal mb-2">User detail</h1>
      <p className="text-steel mb-8">{user.email}</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-steel">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-steel">Email (read-only)</label>
            <Input value={user.email} disabled className="bg-light" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-steel">Role</label>
            <select
              className="input w-full max-w-[200px]"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={saving}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-steel">Status</label>
            <select
              className="input w-full max-w-[200px]"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as UserStatus)}
              disabled={saving}
            >
              {USER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-steel">Email verification</label>
            <select
              className="input w-full max-w-[200px]"
              value={user.emailVerified ? 'verified' : 'unverified'}
              onChange={(e) => handleEmailVerificationChange(e.target.value === 'verified')}
              disabled={saving}
            >
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
            </select>
            {user.emailVerifiedAt && (
              <p className="mt-1 text-xs text-steel">
                Verified at: {new Date(user.emailVerifiedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Info</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-steel space-y-1">
          <p>Created: {new Date(user.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(user.updatedAt).toLocaleString()}</p>
        </CardContent>
      </Card>
    </div>
  );
}
