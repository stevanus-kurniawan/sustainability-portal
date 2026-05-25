'use client';

import { Loader2, Paperclip, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { Button, Input } from '@/components/ui';
import { adminCategoriesList, adminSubContentsList, adminDocumentCreate, adminOperationalUnitsList } from '@/lib/admin-api';
import type { OperationalUnitItem } from '@/lib/admin-api';
import {
  buildUploadStorageFormFields,
  uploadAdminFile,
  uploadStorageContextError,
} from '@/lib/upload-storage';

export interface CertificationFormData {
  name: string;
  issuer: string;
  certificateNo: string;
  issuedDate: string;
  expiryDate: string;
  documentId: number | null;
  externalLink: string;
  categoryId: number | null;
  subContentId: number | null;
  operationalUnitId: number | null;
  attachment: { fileKey: string; fileName: string; mimeType?: string; fileSize?: number } | null;
  currentFileUrl: string | null;
}

const defaultForm: CertificationFormData = {
  name: '',
  issuer: '',
  certificateNo: '',
  issuedDate: '',
  expiryDate: '',
  documentId: null,
  externalLink: '',
  categoryId: null,
  subContentId: null,
  operationalUnitId: null,
  attachment: null,
  currentFileUrl: null,
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
  const [subContentOptions, setSubContentOptions] = useState<{ categoryId: number; subContentId: number; label: string }[]>([]);
  const [operationalUnits, setOperationalUnits] = useState<OperationalUnitItem[]>([]);
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
      categoryId: initialData.categoryId ?? null,
      subContentId: initialData.subContentId ?? null,
      operationalUnitId: initialData.operationalUnitId ?? null,
      attachment: null,
      currentFileUrl: initialData.currentFileUrl ?? null,
    }),
  });
  const [uploading, setUploading] = useState(false);
  const [certificateCategoryId, setCertificateCategoryId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminOperationalUnitsList()
      .then((res) => setOperationalUnits(res.data ?? []))
      .catch(() => setOperationalUnits([]));
  }, []);

  useEffect(() => {
    adminCategoriesList()
      .then((arr) => {
        const list = Array.isArray(arr) ? arr : [];
        const cats = list.map(
          (c: {
            id: number;
            attributes?: { name?: string; slug?: string; mode?: string };
            name?: string;
            mode?: string;
          }) => ({
            id: c.id,
            name: c.attributes?.name ?? c.name ?? '',
            mode: c.attributes?.mode ?? c.mode,
          }),
        );
        const withSub = cats.filter((c) => c.mode === 'WITH_SUBCONTENT');
        if (withSub.length === 0) {
          setSubContentOptions([]);
          return;
        }
        Promise.all(withSub.map((cat) => adminSubContentsList(cat.id)))
          .then((responses) => {
            const options: { categoryId: number; subContentId: number; label: string }[] = [];
            responses.forEach((res, i) => {
              const cat = withSub[i];
              const items = res?.data ?? [];
              items.forEach((s: { id: number; attributes?: { title?: string }; title?: string }) => {
                const title = s.attributes?.title ?? s.title ?? '';
                options.push({ categoryId: cat.id, subContentId: s.id, label: `${cat.name} – ${title}` });
              });
            });
            setSubContentOptions(options);
          })
          .catch(() => setSubContentOptions([]));
      })
      .catch(() => setSubContentOptions([]));
  }, []);

  useEffect(() => {
    adminCategoriesList()
      .then((arr) => {
        const list = Array.isArray(arr) ? arr : [];
        const certCat = list.find(
          (c: { attributes?: { slug: string }; slug?: string }) =>
            ((c.attributes?.slug ?? (c as { slug?: string }).slug) ?? '')
              .toLowerCase()
              .includes('certificate')
        );
        if (certCat?.id) setCertificateCategoryId(certCat.id);
      })
      .catch(() => {});
  }, []);

  const update = (
    field: keyof CertificationFormData,
    value: string | number | null | { fileKey: string; fileName: string; mimeType?: string; fileSize?: number } | null
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const operationalUnitSlug = form.operationalUnitId
        ? operationalUnits.find((u) => u.id === form.operationalUnitId)?.attributes.slug
        : undefined;
      const storageFields = buildUploadStorageFormFields({
        kind: 'certificate',
        operationalUnitSlug,
      });
      if (!storageFields) {
        setError(uploadStorageContextError({ kind: 'certificate', operationalUnitSlug }));
        return;
      }
      const { key } = await uploadAdminFile(file, storageFields);
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
      let documentId: number | null = form.documentId ?? null;
      if (form.attachment) {
        const doc = await adminDocumentCreate({
          title: `Certificate attachment: ${form.name.trim() || 'Untitled'}`,
          type: 'GENERAL',
          contentVersion: 'V2',
          operationalUnitId: form.operationalUnitId,
          categoryId: undefined,
          subContentId: null,
          isPublic: false,
          isPublished: false,
          attachment: form.attachment,
        });
        documentId = doc.id;
      }
      const body: Record<string, unknown> = {
        name: form.name.trim() || undefined,
        issuer: form.issuer.trim() || undefined,
        certificateNo: form.certificateNo.trim() || undefined,
        issuedDate: form.issuedDate || undefined,
        expiryDate: form.expiryDate || undefined,
        documentId: documentId ?? form.documentId ?? (id ? null : undefined),
        externalLink: form.externalLink.trim() || (id ? null : undefined),
        contentVersion: 'V2',
        operationalUnitId: form.operationalUnitId,
        categoryId: null,
        subContentId: null,
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
        <label className="mb-1 block text-sm font-medium text-charcoal">Operational Unit *</label>
        <select
          className="input w-full"
          value={form.operationalUnitId ?? ''}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              operationalUnitId: e.target.value === '' ? null : parseInt(e.target.value, 10),
            }))
          }
          required
        >
          <option value="">— Select operational unit —</option>
          {operationalUnits.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.attributes.name}
            </option>
          ))}
        </select>
      </div>
      {false && subContentOptions.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Sub-content (optional)</label>
          <p className="mb-2 text-xs text-steel">Choose where this will appear in the portal (e.g. site).</p>
          <select
            className="input w-full"
            value={form.categoryId != null && form.subContentId != null ? `${form.categoryId}_${form.subContentId}` : ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setForm((prev) => ({ ...prev, categoryId: null, subContentId: null }));
              } else {
                const [cid, sid] = v.split('_').map(Number);
                setForm((prev) => ({ ...prev, categoryId: cid, subContentId: sid }));
              }
              setError(null);
            }}
          >
            <option value="">— None —</option>
            {subContentOptions.map((opt) => (
              <option key={`${opt.categoryId}_${opt.subContentId}`} value={`${opt.categoryId}_${opt.subContentId}`}>
                {opt.label}
              </option>
            ))}
          </select>
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
        ) : form.currentFileUrl ? (
          <div className="flex items-center gap-2 rounded-md border border-border-light bg-light px-3 py-2 text-sm">
            <a
              href={form.currentFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate flex-1"
            >
              Current attachment (open)
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Replace'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                update('documentId', null);
                update('currentFileUrl', null);
              }}
              className="text-danger hover:bg-danger/10"
            >
              Remove
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
