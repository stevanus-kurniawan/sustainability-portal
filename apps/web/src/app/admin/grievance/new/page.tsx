'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input, Alert } from '@/components/ui';

const defaultForm = {
  caseNo: '',
  status: 'OPEN' as 'OPEN' | 'IN_REVIEW' | 'CLOSED',
  category: '',
  receivedDate: new Date().toISOString().slice(0, 10),
  publicSummary: '',
  evidenceDocumentId: null as number | null,
  externalLink: '',
};

export default function AdminGrievanceNewPage() {
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
        caseNo: form.caseNo.trim(),
        status: form.status,
        category: form.category.trim() || undefined,
        receivedDate: form.receivedDate,
        publicSummary: form.publicSummary.trim() || undefined,
        evidenceDocumentId: form.evidenceDocumentId ?? undefined,
        externalLink: form.externalLink.trim() || undefined,
      };
      const res = await fetch('/api/admin/grievances', {
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
      router.push('/admin/grievance');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-heading text-h1 text-charcoal mb-6">New Grievance Case</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Case number *</label>
          <Input
            required
            value={form.caseNo}
            onChange={(e) => update('caseNo', e.target.value)}
            placeholder="e.g. GRV-2024-001"
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Status</label>
          <select
            className="input w-full"
            value={form.status}
            onChange={(e) => update('status', e.target.value as 'OPEN' | 'IN_REVIEW' | 'CLOSED')}
          >
            <option value="OPEN">Open</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Category</label>
          <Input
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            placeholder="Category"
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Received date *</label>
          <Input
            type="date"
            required
            value={form.receivedDate}
            onChange={(e) => update('receivedDate', e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Public summary</label>
          <textarea
            className="input w-full min-h-[100px]"
            value={form.publicSummary}
            onChange={(e) => update('publicSummary', e.target.value)}
            placeholder="Brief public summary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Attachment / link</label>
          <p className="mb-2 text-xs text-steel">Evidence document ID or external URL.</p>
          <div className="space-y-2">
            <Input
              type="number"
              min={1}
              value={form.evidenceDocumentId ?? ''}
              onChange={(e) =>
                update('evidenceDocumentId', e.target.value === '' ? null : parseInt(e.target.value, 10))
              }
              placeholder="Evidence document ID (optional)"
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
          <Link href="/admin/grievance">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
