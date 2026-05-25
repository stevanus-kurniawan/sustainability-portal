'use client';

import { Loader2, Paperclip, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Button, Input, Alert } from '@/components/ui';
import { adminDocumentGet, adminDocumentCreate, adminDocumentUpdate, adminCategoriesList, adminSubContentsList, adminOperationalUnitsList } from '@/lib/admin-api';
import type { DocumentItem, OperationalUnitItem } from '@/lib/admin-api';
import {
  buildUploadStorageFormFields,
  uploadAdminFile,
  uploadStorageContextError,
} from '@/lib/upload-storage';

interface DocumentFormProps {
  id?: number;
  type: 'POLICY' | 'GRIEVANCE' | 'GENERAL';
  contentVersion?: 'V1' | 'V2';
  policyKind?: 'SOP' | 'FORM';
  regulationKind?: 'NATIONAL' | 'INTERNATIONAL';
  procedureScope?: 'SUSTAINABILITY' | 'OPERATIONAL_UNIT';
  operationalUnitId?: number;
  procedureUnified?: boolean;
  updatesMode?: boolean;
  hideCategoryPicker?: boolean;
  /** When set, category is fixed from the page context; category dropdown is hidden and this slug is resolved to categoryId on submit. */
  categorySlug?: string;
  categoryId?: number;
  backHref: string;
  title: string;
}

export function DocumentForm({
  id,
  type,
  contentVersion,
  policyKind,
  regulationKind,
  procedureScope,
  operationalUnitId,
  procedureUnified = false,
  updatesMode = false,
  hideCategoryPicker = false,
  categorySlug,
  categoryId: categoryIdProp,
  backHref,
  title,
}: DocumentFormProps) {
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
  const [operationalUnits, setOperationalUnits] = useState<OperationalUnitItem[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    externalLink: '',
    code: '',
    documentType: '',
    versionLabel: '',
    effectiveDate: '',
    isPublished: false,
    contentVersion: contentVersion ?? ('V1' as 'V1' | 'V2'),
    policyKind: policyKind ?? ('' as 'SOP' | 'FORM' | ''),
    regulationKind: regulationKind ?? ('' as 'NATIONAL' | 'INTERNATIONAL' | ''),
    procedureScope: procedureScope ?? ('' as 'SUSTAINABILITY' | 'OPERATIONAL_UNIT' | ''),
    operationalUnitId: operationalUnitId ?? ('' as number | ''),
    categoryId: categoryIdProp ?? ('' as number | ''),
    subContentId: '' as number | '',
    tagIds: [] as number[],
    attachment: null as { fileKey: string; fileName: string; mimeType?: string; fileSize?: number } | null,
    currentFileUrl: null as string | null,
    clearAttachment: false,
  });

  const normalizedCategorySlug = categorySlug?.toLowerCase() ?? '';
  const metadataLabels =
    type === 'GRIEVANCE'
      ? {
          code: 'Reference Number',
          type: 'Status',
          version: null,
          date: 'Submitted date',
          codePlaceholder: 'e.g. GRV-001',
          typePlaceholder: 'Select status',
        }
      : normalizedCategorySlug === 'sustainability-report'
        ? {
            code: 'Period',
            type: 'Scope',
            version: 'Version',
            date: 'Publish date',
            codePlaceholder: 'e.g. 2025, Q1 2026',
            typePlaceholder: 'e.g. Company-wide, ESG',
          }
        : regulationKind || form.regulationKind
          ? {
              code: 'Code',
              type: 'Jurisdiction',
              version: 'Version',
              date: 'Effective date',
              codePlaceholder: 'e.g. REG-001',
              typePlaceholder: 'e.g. Indonesia, Global',
            }
          : normalizedCategorySlug === 'standard'
            ? {
                code: 'Code',
                type: 'Body',
                version: 'Version',
                date: 'Effective date',
                codePlaceholder: 'e.g. STD-001',
                typePlaceholder: 'e.g. ISO, RSPO',
              }
            : {
                code: 'Code',
                type: 'Type',
                version: 'Version',
                date: 'Effective date',
                codePlaceholder: 'e.g. POL-001, SOP-02',
                typePlaceholder: 'e.g. Policy, SOP',
              };
  const showDocumentMetadataFields =
    type === 'POLICY' ||
    type === 'GRIEVANCE' ||
    Boolean(regulationKind || form.regulationKind) ||
    ['sop', 'sustainability-report', 'standard'].includes(normalizedCategorySlug) ||
    procedureUnified;
  const showUpdateDateField = updatesMode && form.contentVersion === 'V2' && type === 'GENERAL';
  const showFreeTextTypeField =
    (type === 'POLICY' && form.contentVersion !== 'V2') ||
    (type === 'GENERAL' && normalizedCategorySlug === 'sop') ||
    normalizedCategorySlug === 'sustainability-report' ||
    normalizedCategorySlug === 'standard' ||
    Boolean(regulationKind || form.regulationKind) ||
    type === 'GRIEVANCE';
  const isUnifiedProcedure = procedureUnified && form.contentVersion === 'V2' && type === 'GENERAL';
  const isMappedV2Content =
    type === 'POLICY' ||
    type === 'GRIEVANCE' ||
    Boolean(regulationKind || form.regulationKind) ||
    ['sustainability-report', 'standard'].includes(normalizedCategorySlug);
  const showDescriptionField = !isUnifiedProcedure && !isMappedV2Content;
  const showCategoryPicker =
    type === 'GENERAL' && categories.length > 0 && !categorySlug && !isUnifiedProcedure && !hideCategoryPicker;

  useEffect(() => {
    if (contentVersion !== 'V2') return;
    adminOperationalUnitsList()
      .then((res) => setOperationalUnits(res.data ?? []))
      .catch(() => setOperationalUnits([]));
  }, [contentVersion]);

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
  const showSubContentPicker = needsSubContent && !isUnifiedProcedure && !hideCategoryPicker;

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
          code?: string | null;
          documentType?: string | null;
          versionLabel?: string | null;
          effectiveDate?: string | null;
          currentVersion?: { data?: { attributes?: { file?: { data?: { attributes?: { url?: string; name?: string } } } } } | null };
          subContentId?: number | null;
          subContent?: { data?: { id: number } } | null;
          contentVersion?: 'V1' | 'V2';
          policyKind?: 'SOP' | 'FORM' | null;
          regulationKind?: 'NATIONAL' | 'INTERNATIONAL' | null;
          procedureScope?: 'SUSTAINABILITY' | 'OPERATIONAL_UNIT' | null;
          operationalUnitId?: number | null;
        };
        const fileUrl = attrs.currentVersion?.data?.attributes?.file?.data?.attributes?.url ?? null;
        const effectiveDateStr = attrs.effectiveDate ?? null;
        setForm({
          title: doc.attributes.title,
          description: doc.attributes.description ?? '',
          externalLink: (doc.attributes as { externalLink?: string | null }).externalLink ?? '',
          code: attrs.code ?? '',
          documentType: attrs.documentType ?? '',
          versionLabel: attrs.versionLabel ?? '',
          effectiveDate: effectiveDateStr ? effectiveDateStr.slice(0, 10) : '',
          isPublished: doc.attributes.isPublished,
          contentVersion: attrs.contentVersion ?? contentVersion ?? 'V1',
          policyKind: attrs.policyKind ?? policyKind ?? '',
          regulationKind: attrs.regulationKind ?? regulationKind ?? '',
          procedureScope: attrs.procedureScope ?? procedureScope ?? '',
          operationalUnitId: attrs.operationalUnitId ?? operationalUnitId ?? '',
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
      const operationalUnitSlug =
        typeof form.operationalUnitId === 'number'
          ? operationalUnits.find((u) => u.id === form.operationalUnitId)?.attributes.slug
          : undefined;
      const storageFields = buildUploadStorageFormFields({
        type,
        updatesMode,
        procedureUnified,
        procedureScope: form.procedureScope || undefined,
        operationalUnitSlug,
        categorySlug,
        regulationKind: form.regulationKind || regulationKind,
      });
      if (!storageFields) {
        setError(
          uploadStorageContextError({
            type,
            updatesMode,
            procedureUnified,
            procedureScope: form.procedureScope || undefined,
            operationalUnitSlug,
            categorySlug,
            regulationKind: form.regulationKind || regulationKind,
          }),
        );
        return;
      }
      const { key } = await uploadAdminFile(file, storageFields);
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
        showSubContentPicker && typeof form.subContentId === 'number'
          ? form.subContentId
          : showSubContentPicker
            ? undefined
            : null;
      if (showSubContentPicker && (subContentId == null || subContentId === 0)) {
        setError('Please select a sub-content for this section.');
        setSaving(false);
        return;
      }
      if (isUnifiedProcedure) {
        if (!form.procedureScope) {
          setError('Please select a source.');
          setSaving(false);
          return;
        }
        if (form.procedureScope === 'OPERATIONAL_UNIT') {
          if (typeof form.operationalUnitId !== 'number') {
            setError('Please select an operational unit.');
            setSaving(false);
            return;
          }
          if (!form.documentType) {
            setError('Please select a procedure type.');
            setSaving(false);
            return;
          }
        }
      }
      const body = {
        title: form.title.trim(),
        type,
        description: showDescriptionField ? form.description.trim() || undefined : undefined,
        externalLink: form.externalLink.trim() || undefined,
        isPublic: isUnifiedProcedure ? true : form.isPublished,
        isPublished: isUnifiedProcedure ? true : form.isPublished,
        contentVersion: form.contentVersion,
        policyKind: type === 'POLICY' && form.contentVersion === 'V2' ? null : form.policyKind || null,
        regulationKind: form.regulationKind || null,
        procedureScope: form.procedureScope || null,
        operationalUnitId:
          typeof form.operationalUnitId === 'number' ? form.operationalUnitId : null,
        categoryId: categoryId ?? (categoryIdProp ?? undefined),
        subContentId: showSubContentPicker ? subContentId : null,
        tagIds: form.tagIds,
        ...(showUpdateDateField && {
          documentType: 'UPDATE',
          effectiveDate: form.effectiveDate ? form.effectiveDate : undefined,
        }),
        ...(showDocumentMetadataFields && {
          code: form.code.trim() || undefined,
          documentType: form.documentType.trim() || undefined,
          versionLabel: form.versionLabel.trim() || undefined,
          effectiveDate: form.effectiveDate ? form.effectiveDate : undefined,
        }),
        ...(form.attachment && { attachment: form.attachment }),
      };
      if (id) {
        await adminDocumentUpdate(id, {
          ...body,
          externalLink: form.externalLink.trim() || null,
          subContentId: body.subContentId ?? null,
          ...(showDocumentMetadataFields && {
            effectiveDate: form.effectiveDate ? form.effectiveDate : null,
          }),
          ...(showUpdateDateField && {
            documentType: 'UPDATE',
            effectiveDate: form.effectiveDate ? form.effectiveDate : null,
          }),
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
        {isUnifiedProcedure && (
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Source *</label>
            <select
              className="input w-full"
              value={form.procedureScope}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  procedureScope: e.target.value as 'SUSTAINABILITY' | 'OPERATIONAL_UNIT',
                  operationalUnitId: e.target.value === 'OPERATIONAL_UNIT' ? prev.operationalUnitId : ('' as number | ''),
                  documentType: e.target.value === 'OPERATIONAL_UNIT' ? prev.documentType : '',
                }))
              }
              required
            >
              <option value="">— Select source —</option>
              <option value="SUSTAINABILITY">Holding Company</option>
              <option value="OPERATIONAL_UNIT">Operational Unit</option>
            </select>
          </div>
        )}
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
        {showDescriptionField && (
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Summary / Description</label>
          <textarea
            className="input w-full min-h-[100px]"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Optional summary or description"
          />
        </div>
        )}
        {form.contentVersion === 'V2' && type === 'GENERAL' && (regulationKind || form.regulationKind) && (
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Regulation type *</label>
            <select
              className="input w-full"
              value={form.regulationKind}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, regulationKind: e.target.value as 'NATIONAL' | 'INTERNATIONAL' }))
              }
              required
            >
              <option value="">— Select type —</option>
              <option value="NATIONAL">National</option>
              <option value="INTERNATIONAL">International</option>
            </select>
          </div>
        )}
        {form.contentVersion === 'V2' && form.procedureScope === 'OPERATIONAL_UNIT' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Operational Unit *</label>
            <select
              className="input w-full"
              value={form.operationalUnitId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  operationalUnitId: e.target.value === '' ? ('' as number | '') : parseInt(e.target.value, 10),
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
        )}
        {isUnifiedProcedure && form.procedureScope === 'OPERATIONAL_UNIT' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Type *</label>
            <select
              className="input w-full"
              value={form.documentType}
              onChange={(e) => setForm((prev) => ({ ...prev, documentType: e.target.value }))}
              required
            >
              <option value="">— Select type —</option>
              <option value="SOP">SOP</option>
              <option value="FORM">Form</option>
            </select>
          </div>
        )}
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
        {showDocumentMetadataFields && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">{metadataLabels.code}</label>
              <Input
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder={metadataLabels.codePlaceholder}
                className="w-full"
              />
              <p className="mt-1 text-xs text-steel">Optional. Shown in the visitor table.</p>
            </div>
            {showFreeTextTypeField && (
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">{metadataLabels.type}</label>
              {type === 'GRIEVANCE' ? (
                <select
                  className="input w-full"
                  value={form.documentType}
                  onChange={(e) => setForm((prev) => ({ ...prev, documentType: e.target.value }))}
                >
                  <option value="">— Select status —</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              ) : (
                <Input
                  value={form.documentType}
                  onChange={(e) => setForm((prev) => ({ ...prev, documentType: e.target.value }))}
                  placeholder={metadataLabels.typePlaceholder}
                  className="w-full"
                />
              )}
              <p className="mt-1 text-xs text-steel">Optional. Shown in the visitor table.</p>
            </div>
            )}
            {metadataLabels.version && (
              <div>
                <label className="mb-1 block text-sm font-medium text-charcoal">{metadataLabels.version}</label>
                <Input
                  value={form.versionLabel}
                  onChange={(e) => setForm((prev) => ({ ...prev, versionLabel: e.target.value }))}
                  placeholder="e.g. v1.0, 2"
                  className="w-full"
                />
                <p className="mt-1 text-xs text-steel">Optional. Version label shown in the table.</p>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">{metadataLabels.date}</label>
              <Input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
                className="w-full"
              />
              <p className="mt-1 text-xs text-steel">Optional. Date from which this document is effective.</p>
            </div>
          </>
        )}
        {showUpdateDateField && (
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Date</label>
            <Input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
              className="w-full"
            />
            <p className="mt-1 text-xs text-steel">Optional. Date shown in the visitor Updates table.</p>
          </div>
        )}
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
        {showCategoryPicker && (
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
        {showSubContentPicker && (
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
        {!isUnifiedProcedure && (
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
        )}
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
