'use client';

import { Loader2, Paperclip, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Button, Input, Alert } from '@/components/ui';
import { adminDocumentGet, adminDocumentCreate, adminDocumentUpdate, adminCategoriesList, adminSubContentsList } from '@/lib/admin-api';
import type { DocumentItem } from '@/lib/admin-api';

interface DocumentFormProps {
  id?: number;
  type: 'POLICY' | 'GRIEVANCE' | 'GENERAL';
  /** When set, category is fixed from the page context; category dropdown is hidden and this slug is resolved to categoryId on submit. */
  categorySlug?: string;
  categoryId?: number;
  backHref: string;
  title: string;
}

export function DocumentForm({ id, type, categorySlug, categoryId: categoryIdProp, backHref, title }: DocumentFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subContentIdFromUrl = searchParams.get('subContentId');
  const categoryIdFromUrl = searchParams.get('categoryId');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string; slug: string; mode?: string }[]>([]);
  const [subContents, setSubContents] = useState<{ id: number; title: string; slug: string }[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    externalLink: '',
    isPublished: false,
    categoryId: categoryIdProp ?? ('' as number | ''),
    subContentId: '' as number | '',
    tagIds: [] as number[],
    attachment: null as { fileKey: string; fileName: string; mimeType?: string; fileSize?: number } | null,
    currentFileUrl: null as string | null,
    clearAttachment: false,
  });

  useEffect(() => {
    adminCategoriesList()
      .then((arr) => {
        const list = Array.isArray(arr) ? arr : [];
        const mapped = list.map(
          (c: {
            id: number;
            attributes?: { name?: string; slug?: string; mode?: string };
            name?: string;
            slug?: string;
            mode?: string;
          }) => ({
            id: c.id,
            name: c.attributes?.name ?? c.name ?? '',
            slug: c.attributes?.slug ?? c.slug ?? '',
            mode: c.attributes?.mode ?? c.mode,
          }),
        );
        setCategories(mapped);
        if (categorySlug && !categoryIdProp) {
          const slugLower = categorySlug.toLowerCase();
          const found = mapped.find((c) => (c.slug || '').toLowerCase() === slugLower);
          if (found) setForm((prev) => ({ ...prev, categoryId: found.id }));
        }
        if (categoryIdFromUrl) {
          const cid = parseInt(categoryIdFromUrl, 10);
          if (!Number.isNaN(cid)) setForm((prev) => ({ ...prev, categoryId: cid }));
        }
      })
      .catch(() => {});
  }, [categorySlug, categoryIdProp, categoryIdFromUrl]);

  const effectiveCategoryId = typeof form.categoryId === 'number' ? form.categoryId : categoryIdProp ?? null;
  const selectedCategory = effectiveCategoryId != null ? categories.find((c) => c.id === effectiveCategoryId) : null;
  const needsSubContent = selectedCategory?.mode === 'WITH_SUBCONTENT';

  useEffect(() => {
    if (!needsSubContent || effectiveCategoryId == null) {
      setSubContents([]);
      return;
    }
    adminSubContentsList(effectiveCategoryId)
      .then((res) => {
        const list = res?.data ?? [];
        const mapped = list.map(
          (s: {
            id: number;
            attributes?: { title?: string; slug?: string };
            title?: string;
            slug?: string;
          }) => ({
            id: s.id,
            title: s.attributes?.title ?? s.title ?? '',
            slug: s.attributes?.slug ?? s.slug ?? '',
          }),
        );
        setSubContents(mapped);
        if (subContentIdFromUrl && !id) {
          const sid = parseInt(subContentIdFromUrl, 10);
          if (!Number.isNaN(sid) && mapped.some((s) => s.id === sid)) {
            setForm((prev) => ({ ...prev, subContentId: sid }));
          }
        }
      })
      .catch(() => setSubContents([]));
  }, [needsSubContent, effectiveCategoryId, subContentIdFromUrl, id]);

  useEffect(() => {
    if (!id) {
      const resolved = categoryIdProp ?? (typeof form.categoryId === 'number' ? form.categoryId : undefined);
      if (resolved != null) setForm((prev) => ({ ...prev, categoryId: resolved }));
      return;
    }
    setLoading(true);
    adminDocumentGet(id)
      .then((doc) => {
        if (!doc) return;
        const attrs = doc.attributes as {
          externalLink?: string | null;
          currentVersion?: { data?: { attributes?: { file?: { data?: { attributes?: { url?: string; name?: string } } } } } | null };
          subContentId?: number | null;
          subContent?: { data?: { id: number } } | null;
        };
        const fileUrl = attrs.currentVersion?.data?.attributes?.file?.data?.attributes?.url ?? null;
        setForm({
          title: doc.attributes.title,
          description: doc.attributes.description ?? '',
          externalLink: (doc.attributes as { externalLink?: string | null }).externalLink ?? '',
          isPublished: doc.attributes.isPublished,
          categoryId: doc.attributes.category?.data?.id ?? categoryIdProp ?? ('' as number | ''),
          subContentId: attrs.subContentId ?? attrs.subContent?.data?.id ?? ('' as number | ''),
          tagIds: (doc.attributes.tags?.data ?? []).map((t: { id: number }) => t.id),
          attachment: null,
          currentFileUrl: fileUrl || null,
          clearAttachment: false,
        });
      })
      .catch(() => setError('Failed to load document'))
      .finally(() => setLoading(false));
  }, [id, categoryIdProp]);

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
      setForm((prev) => ({
        ...prev,
        attachment: {
          fileKey: key,
          fileName: file.name,
          mimeType: file.type || undefined,
          fileSize: file.size,
        },
        currentFileUrl: null,
      }));
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
      let categoryId: number | undefined = typeof form.categoryId === 'number' ? form.categoryId : undefined;
      if (categorySlug && categoryId == null && categories.length > 0) {
        const slugLower = categorySlug.toLowerCase();
        const found = categories.find((c) => (c.slug || '').toLowerCase() === slugLower);
        if (found) categoryId = found.id;
      }
      const subContentId =
        needsSubContent && typeof form.subContentId === 'number' ? form.subContentId : needsSubContent ? undefined : null;
      if (needsSubContent && (subContentId == null || subContentId === 0)) {
        setError('Please select a sub-content for this section.');
        setSaving(false);
        return;
      }
      const body = {
        title: form.title.trim(),
        type,
        description: form.description.trim() || undefined,
        externalLink: form.externalLink.trim() || undefined,
        isPublic: form.isPublished,
        isPublished: form.isPublished,
        categoryId: categoryId ?? (categoryIdProp ?? undefined),
        subContentId: needsSubContent ? subContentId : null,
        tagIds: form.tagIds,
        ...(form.attachment && { attachment: form.attachment }),
      };
      if (id) {
        await adminDocumentUpdate(id, {
          ...body,
          externalLink: form.externalLink.trim() || null,
          subContentId: body.subContentId ?? null,
          attachment: form.clearAttachment ? null : (form.attachment ?? undefined),
        });
      } else {
        await adminDocumentCreate(body);
      }
      router.push(backHref);
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
      <h1 className="font-heading text-h1 text-charcoal mb-6">{title}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Title *</label>
          <Input
            required
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Document title"
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Summary / Description</label>
          <textarea
            className="input w-full min-h-[100px]"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Optional summary or description"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            External link (URL)
          </label>
          <Input
            type="url"
            value={form.externalLink}
            onChange={(e) => setForm((prev) => ({ ...prev, externalLink: e.target.value }))}
            placeholder="https://..."
            className="w-full"
          />
          <p className="mt-1 text-xs text-steel">Optional. Link to external document or resource.</p>
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
                onClick={() => setForm((prev) => ({ ...prev, attachment: null }))}
                className="text-danger hover:bg-danger/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : form.currentFileUrl && !form.clearAttachment ? (
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
                onClick={() => setForm((prev) => ({ ...prev, clearAttachment: true, currentFileUrl: null }))}
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
          <p className="mt-1 text-xs text-steel">Optional. PDF, Word, Excel, images, etc.</p>
        </div>
        {type === 'GENERAL' && categories.length > 0 && !categorySlug && (
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Category</label>
            <select
              className="input w-full"
              value={form.categoryId === '' ? '' : form.categoryId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  categoryId: e.target.value === '' ? ('' as number | '') : parseInt(e.target.value, 10),
                  subContentId: '' as number | '',
                }))
              }
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {needsSubContent && (
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Sub-content *</label>
            <select
              className="input w-full"
              value={form.subContentId === '' ? '' : form.subContentId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  subContentId: e.target.value === '' ? ('' as number | '') : parseInt(e.target.value, 10),
                }))
              }
              required={needsSubContent}
            >
              <option value="">— Select sub-content (e.g. site) —</option>
              {subContents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-steel">This section uses sub-contents; select one (e.g. Jakarta, Tanjung Pura).</p>
          </div>
        )}
        <div>
          <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
              className="rounded border-border-medium"
            />
            Published
          </label>
          <p className="mt-1 ml-6 text-xs text-steel">When checked, this document is published and visible on the public site (e.g. Policies, Library).</p>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving || uploading} isLoading={saving}>
            {id ? 'Update' : 'Create'}
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
