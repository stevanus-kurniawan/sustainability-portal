'use client';

import { Loader2, Paperclip, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Button, Input, Alert } from '@/components/ui';
import { adminSubContentsList, adminCategoriesList, adminDocumentCreate } from '@/lib/admin-api';

const defaultForm = {
  name: '',
  authority: '',
  licenseNo: '',
  issuedDate: '',
  expiryDate: '',
  documentId: null as number | null,
  subContentId: null as number | null,
  externalLink: '',
  attachment: null as { fileKey: string; fileName: string; mimeType?: string; fileSize?: number } | null,
};

function toFormValue(date: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function AdminLicensesNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryIdStr = searchParams.get('categoryId');
  const subContentIdStr = searchParams.get('subContentId');
  const categoryId = categoryIdStr ? parseInt(categoryIdStr, 10) : undefined;
  const subContentIdFromUrl = subContentIdStr ? parseInt(subContentIdStr, 10) : undefined;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [subContents, setSubContents] = useState<{ id: number; title: string; slug: string }[]>([]);
  const [licenseCategoryId, setLicenseCategoryId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backHref =
    categoryIdStr && subContentIdStr
      ? `/admin/licenses?categoryId=${categoryIdStr}&subContentId=${subContentIdStr}`
      : '/admin/licenses';

  useEffect(() => {
    adminCategoriesList()
      .then((arr) => {
        const list = Array.isArray(arr) ? arr : [];
        const licenseCat = list.find(
          (c: { attributes?: { slug: string }; slug?: string }) =>
            ((c.attributes?.slug ?? (c as { slug?: string }).slug) ?? '').toLowerCase() === 'license' ||
            ((c.attributes?.slug ?? (c as { slug?: string }).slug) ?? '').toLowerCase() === 'licenses'
        );
        const catId = licenseCat?.id ?? categoryId;
        if (catId) setLicenseCategoryId(catId);
      })
      .catch(() => {});
  }, [categoryId]);

  const effectiveCategoryId = categoryId ?? licenseCategoryId ?? undefined;

  useEffect(() => {
    if (!effectiveCategoryId) return;
    adminSubContentsList(effectiveCategoryId)
      .then((res) => {
        const list = res?.data ?? [];
        const mapped = list.map((s: { id: number; attributes?: { title: string; slug: string }; title?: string; slug?: string }) => ({
          id: s.id,
          title: s.attributes?.title ?? (s as { title?: string }).title ?? '',
          slug: s.attributes?.slug ?? (s as { slug?: string }).slug ?? '',
        }));
        setSubContents(mapped);
        if (subContentIdFromUrl && !Number.isNaN(subContentIdFromUrl) && mapped.some((x) => x.id === subContentIdFromUrl)) {
          setForm((prev) => ({ ...prev, subContentId: subContentIdFromUrl }));
        }
      })
      .catch(() => setSubContents([]));
  }, [effectiveCategoryId, subContentIdFromUrl]);

  const update = (field: keyof typeof defaultForm, value: string | number | null | typeof defaultForm.attachment) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set('file', file, file.name);
      const uploadRes = await fetch('/api/admin/upload/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.message || 'Upload failed');
      }
      const { key } = await uploadRes.json();
      if (!key) throw new Error('Upload not configured');
      update('attachment', {
        fileKey: key,
        fileName: file.name,
        mimeType: file.type || undefined,
        fileSize: file.size,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let documentId: number | undefined = form.documentId ?? undefined;
      if (form.attachment && licenseCategoryId) {
        const doc = await adminDocumentCreate({
          title: `License attachment: ${form.name.trim() || 'Untitled'}`,
          type: 'GENERAL',
          categoryId: licenseCategoryId,
          subContentId: form.subContentId ?? undefined,
          isPublic: false,
          isPublished: false,
          attachment: form.attachment,
        });
        documentId = doc.id;
      }
      const body: Record<string, unknown> = {
        name: form.name.trim() || undefined,
        authority: form.authority.trim() || undefined,
        licenseNo: form.licenseNo.trim() || undefined,
        issuedDate: form.issuedDate || undefined,
        expiryDate: form.expiryDate || undefined,
        documentId: documentId ?? form.documentId ?? undefined,
        subContentId: form.subContentId ?? undefined,
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
      router.push(backHref);
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
        {effectiveCategoryId != null && subContents.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Sub-content *</label>
            <select
              className="input w-full"
              value={form.subContentId ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  subContentId: e.target.value === '' ? null : parseInt(e.target.value, 10),
                }))
              }
              required
            >
              <option value="">— Select sub-content —</option>
              {subContents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        )}
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
          <label className="mb-1 block text-sm font-medium text-charcoal flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachment (file)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {form.attachment ? (
            <div className="flex items-center gap-2 rounded-md border border-border-light bg-light px-3 py-2 text-sm text-charcoal">
              <Paperclip className="h-4 w-4 text-steel" />
              <span className="flex-1 truncate">{form.attachment.fileName}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => update('attachment', null)}
                className="text-danger hover:bg-danger/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              {uploading ? 'Uploading…' : 'Choose file'}
            </Button>
          )}
          <p className="mt-2 text-xs text-steel">Or add an external URL below.</p>
          <div className="mt-2">
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
          <Button type="submit" disabled={saving || uploading} isLoading={saving}>
            Create
          </Button>
          <Link href={backHref}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
