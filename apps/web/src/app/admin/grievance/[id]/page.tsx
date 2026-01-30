'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button, Input, Alert } from '@/components/ui';

function toFormValue(date: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function AdminGrievanceEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    caseNo: '',
    status: 'OPEN' as 'OPEN' | 'IN_REVIEW' | 'CLOSED',
    category: '',
    receivedDate: '',
    publicSummary: '',
    evidenceDocumentId: null as number | null,
    externalLink: '',
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/grievances/${id}`, { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) router.replace('/admin/login');
        return res.json();
      })
      .then((data) => {
        const attrs = data?.attributes ?? data;
        setForm({
          caseNo: attrs.caseNo ?? '',
          status: attrs.status ?? 'OPEN',
          category: attrs.category ?? '',
          receivedDate: toFormValue(attrs.receivedDate ?? null),
          publicSummary: attrs.publicSummary ?? '',
          evidenceDocumentId: attrs.evidenceDocumentId ?? null,
          externalLink: attrs.externalLink ?? '',
        });
      })
      .catch(() => setError('Failed to load grievance case'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const update = (field: keyof typeof form, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        status: form.status,
        category: form.category.trim() || undefined,
        publicSummary: form.publicSummary.trim() || undefined,
        evidenceDocumentId: form.evidenceDocumentId ?? null,
        externalLink: form.externalLink.trim() || null,
      };
      const res = await fetch(`/api/admin/grievances/${id}`, {
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
      router.push('/admin/grievance');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center text-steel">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-heading text-h1 text-charcoal mb-6">Edit Grievance Case</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Case number</label>
          <Input value={form.caseNo} readOnly disabled className="w-full bg-light" />
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
          <label className="mb-1 block text-sm font-medium text-charcoal">Received date</label>
          <Input
            type="date"
            value={form.receivedDate}
            readOnly
            disabled
            className="w-full bg-light"
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
            Update
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
