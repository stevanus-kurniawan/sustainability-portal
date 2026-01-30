'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input, Alert } from '@/components/ui';

const defaultForm = {
  name: '',
  authority: '',
  licenseNo: '',
  issuedDate: '',
  expiryDate: '',
  documentId: null as number | null,
  externalLink: '',
};

function toFormValue(date: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function AdminLicensesNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const update = (field: keyof typeof defaultForm, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim() || undefined,
        authority: form.authority.trim() || undefined,
        licenseNo: form.licenseNo.trim() || undefined,
        issuedDate: form.issuedDate || undefined,
        expiryDate: form.expiryDate || undefined,
        documentId: form.documentId ?? undefined,
        externalLink: form.externalLink.trim() || undefined,
      };
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || res.statusText);
        return;
      }
      router.push('/admin/licenses');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-heading text-h1 text-charcoal mb-6">New License</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Name *</label>
          <Input
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="License name"
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Authority</label>
          <Input
            value={form.authority}
            onChange={(e) => update('authority', e.target.value)}
            placeholder="Issuing authority"
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">License number</label>
          <Input
            value={form.licenseNo}
            onChange={(e) => update('licenseNo', e.target.value)}
            placeholder="License no."
            className="w-full"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Issued date</label>
            <Input
              type="date"
              value={form.issuedDate}
              onChange={(e) => update('issuedDate', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Expiry date</label>
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => update('expiryDate', e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Attachment / link</label>
          <p className="mb-2 text-xs text-steel">Document ID or external URL.</p>
          <div className="space-y-2">
            <Input
              type="number"
              min={1}
              value={form.documentId ?? ''}
              onChange={(e) => update('documentId', e.target.value === '' ? null : parseInt(e.target.value, 10))}
              placeholder="Document ID (optional)"
              className="w-full"
            />
            <Input
              type="url"
              value={form.externalLink}
              onChange={(e) => update('externalLink', e.target.value)}
              placeholder="External link URL (optional)"
              className="w-full"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving} isLoading={saving}>
            Create
          </Button>
          <Link href="/admin/licenses">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
