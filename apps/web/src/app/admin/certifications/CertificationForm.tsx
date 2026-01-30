'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Input } from '@/components/ui';

export interface CertificationFormData {
  name: string;
  issuer: string;
  certificateNo: string;
  issuedDate: string;
  expiryDate: string;
  documentId: number | null;
  externalLink: string;
}

const defaultForm: CertificationFormData = {
  name: '',
  issuer: '',
  certificateNo: '',
  issuedDate: '',
  expiryDate: '',
  documentId: null,
  externalLink: '',
};

function toFormValue(date: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

interface CertificationFormProps {
  initialData?: Partial<CertificationFormData> | null;
  id?: number;
}

export function CertificationForm({ initialData, id }: CertificationFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CertificationFormData>({
    ...defaultForm,
    ...(initialData && {
      name: initialData.name ?? '',
      issuer: initialData.issuer ?? '',
      certificateNo: initialData.certificateNo ?? '',
      issuedDate: toFormValue(initialData.issuedDate ?? null),
      expiryDate: toFormValue(initialData.expiryDate ?? null),
      documentId: initialData.documentId ?? null,
      externalLink: initialData.externalLink ?? '',
    }),
  });

  const update = (field: keyof CertificationFormData, value: string | number | null) => {
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
        issuer: form.issuer.trim() || undefined,
        certificateNo: form.certificateNo.trim() || undefined,
        issuedDate: form.issuedDate || undefined,
        expiryDate: form.expiryDate || undefined,
        documentId: form.documentId != null ? form.documentId : (id ? null : undefined),
        externalLink: form.externalLink.trim() || (id ? null : undefined),
      };
      if (id) {
        const res = await fetch(`/api/admin/certifications/${id}`, {
          method: 'PUT',
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
        router.push('/admin/certifications');
        router.refresh();
      } else {
        const res = await fetch('/api/admin/certifications', {
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
        router.push('/admin/certifications');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
      {error && (
        <div className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-charcoal">Name *</label>
        <Input
          required
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Certification name"
          className="w-full"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-charcoal">Issuer</label>
        <Input
          value={form.issuer}
          onChange={(e) => update('issuer', e.target.value)}
          placeholder="Issuing organization"
          className="w-full"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-charcoal">Certificate number</label>
        <Input
          value={form.certificateNo}
          onChange={(e) => update('certificateNo', e.target.value)}
          placeholder="Cert no."
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
        <p className="mb-2 text-xs text-steel">Link to a document (ID) or add an external URL.</p>
        <div className="space-y-2">
          <Input
            type="number"
            min={1}
            value={form.documentId ?? ''}
            onChange={(e) =>
              update('documentId', e.target.value === '' ? null : parseInt(e.target.value, 10))
            }
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
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : id ? (
            'Update'
          ) : (
            'Create'
          )}
        </Button>
        <Link href="/admin/certifications">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
