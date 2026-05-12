'use client';

import { Building2, Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';
import {
  adminOperationalUnitCreate,
  adminOperationalUnitDelete,
  adminOperationalUnitsList,
  adminOperationalUnitUpdate,
  type OperationalUnitColorClass,
  type OperationalUnitItem,
} from '@/lib/admin-api';

const COLOR_OPTIONS: { value: OperationalUnitColorClass; label: string }[] = [
  { value: 'text-primary', label: 'Brand Red' },
  { value: 'text-success', label: 'Green' },
  { value: 'text-warning', label: 'Orange' },
  { value: 'text-brand-deep', label: 'Blue' },
  { value: 'text-charcoal', label: 'Charcoal' },
];

type NewUnitForm = {
  name: string;
  colorClass: OperationalUnitColorClass;
  logoFileKey: string | null;
};

const INITIAL_FORM: NewUnitForm = {
  name: '',
  colorClass: 'text-primary',
  logoFileKey: null,
};

async function uploadLogo(file: File): Promise<string> {
  const form = new FormData();
  form.set('file', file);
  const res = await fetch('/api/admin/upload/upload', {
    method: 'POST',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data?.key !== 'string') {
    throw new Error(data?.message || 'Failed to upload logo');
  }
  return data.key;
}

export default function AdminOperationalUnitsPage() {
  const [units, setUnits] = useState<OperationalUnitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<NewUnitForm>(INITIAL_FORM);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<NewUnitForm>(INITIAL_FORM);

  async function loadUnits() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminOperationalUnitsList();
      setUnits(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load units');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUnits();
  }, []);

  const previewUrl = useMemo(() => {
    if (!form.logoFileKey) return null;
    return `/api/v1/public/files/preview?key=${encodeURIComponent(form.logoFileKey)}`;
  }, [form.logoFileKey]);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await adminOperationalUnitCreate({
        name: form.name.trim(),
        colorClass: form.colorClass,
        logoFileKey: form.logoFileKey,
      });
      setUnits((prev) => [...prev, created].sort((a, b) => a.attributes.name.localeCompare(b.attributes.name)));
      setForm(INITIAL_FORM);
      setSuccess('Operational unit added.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this operational unit?')) return;
    setError(null);
    setSuccess(null);
    try {
      await adminOperationalUnitDelete(id);
      setUnits((prev) => prev.filter((u) => u.id !== id));
      setSuccess('Operational unit deleted.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function handleSaveEdit() {
    if (!editingUnitId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await adminOperationalUnitUpdate(editingUnitId, {
        name: editForm.name.trim(),
        colorClass: editForm.colorClass,
        logoFileKey: editForm.logoFileKey,
      });
      setUnits((prev) =>
        prev
          .map((unit) => (unit.id === editingUnitId ? updated : unit))
          .sort((a, b) => a.attributes.name.localeCompare(b.attributes.name)),
      );
      setEditingUnitId(null);
      setEditForm(INITIAL_FORM);
      setSuccess('Operational unit updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-heading text-h2 text-charcoal">Operational Units</h1>
        <p className="mt-1 text-sm text-steel">Manage unit cards and logo uploads for the public dashboard.</p>
      </div>

      {error && (
        <Alert className="mb-4" variant="error">
          {error}
        </Alert>
      )}
      {success && <Alert className="mb-4">{success}</Alert>}

      <Card className="mb-6 border-border-light">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Add New Operational Unit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-charcoal">Unit name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. TPG"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">Name color</label>
              <Select
                options={COLOR_OPTIONS}
                value={form.colorClass}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, colorClass: e.target.value as OperationalUnitColorClass }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border-light bg-surface px-3 py-2 text-sm font-medium text-charcoal hover:bg-light">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload logo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  setError(null);
                  try {
                    const key = await uploadLogo(file);
                    setForm((prev) => ({ ...prev, logoFileKey: key }));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Upload failed');
                  } finally {
                    setUploading(false);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            {form.logoFileKey && <p className="text-xs text-steel">{form.logoFileKey}</p>}
            {previewUrl && (
              <img src={previewUrl} alt="Logo preview" className="h-12 w-12 rounded-md border border-border-light bg-white object-contain" />
            )}
          </div>

          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => void handleCreate()}
            isLoading={saving}
            disabled={!form.name.trim() || uploading}
          >
            Add Unit
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border-light">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Current Units</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-steel">Loading units...</p>
          ) : units.length === 0 ? (
            <p className="text-sm text-steel">No operational units yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {units.map((unit) => {
                const logoUrl = unit.attributes.logoFileKey
                  ? `/api/v1/public/files/preview?key=${encodeURIComponent(unit.attributes.logoFileKey)}`
                  : null;
                return (
                  <div key={unit.id} className="flex items-center justify-between rounded-md border border-border-light bg-surface p-3">
                    {editingUnitId === unit.id ? (
                      <div className="w-full space-y-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Unit name"
                            className="md:col-span-2"
                          />
                          <Select
                            options={COLOR_OPTIONS}
                            value={editForm.colorClass}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                colorClass: e.target.value as OperationalUnitColorClass,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border-light bg-surface px-3 py-2 text-sm font-medium text-charcoal hover:bg-light">
                            <Upload className="h-4 w-4" />
                            {uploading ? 'Uploading...' : 'Replace logo'}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploading(true);
                                setError(null);
                                try {
                                  const key = await uploadLogo(file);
                                  setEditForm((prev) => ({ ...prev, logoFileKey: key }));
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Upload failed');
                                } finally {
                                  setUploading(false);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>
                          {editForm.logoFileKey && (
                            <img
                              src={`/api/v1/public/files/preview?key=${encodeURIComponent(editForm.logoFileKey)}`}
                              alt="Logo preview"
                              className="h-10 w-10 rounded-md border border-border-light bg-white object-contain"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setEditForm((prev) => ({ ...prev, logoFileKey: null }))}
                            className="text-xs text-steel underline"
                          >
                            Remove logo
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => void handleSaveEdit()} isLoading={saving} disabled={!editForm.name.trim()}>
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingUnitId(null);
                              setEditForm(INITIAL_FORM);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-light">
                            {logoUrl ? (
                              <img src={logoUrl} alt={`${unit.attributes.name} logo`} className="h-10 w-10 object-contain" />
                            ) : (
                              <Building2 className="h-5 w-5 text-steel" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`truncate font-heading text-base font-semibold ${unit.attributes.colorClass}`}>
                              {unit.attributes.name}
                            </p>
                            <p className="truncate text-xs text-steel">{unit.attributes.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUnitId(unit.id);
                              setEditForm({
                                name: unit.attributes.name,
                                colorClass: (unit.attributes.colorClass as OperationalUnitColorClass) || 'text-primary',
                                logoFileKey: unit.attributes.logoFileKey,
                              });
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-danger/40 text-danger hover:bg-danger/10"
                            leftIcon={<Trash2 className="h-4 w-4" />}
                            onClick={() => void handleDelete(unit.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
