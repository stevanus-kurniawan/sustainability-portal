'use client';

import { Building2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import {
  adminOperationalUnitCreate,
  adminOperationalUnitDelete,
  adminOperationalUnitsList,
  adminOperationalUnitUpdate,
  type OperationalUnitItem,
} from '@/lib/admin-api';

type UnitForm = {
  name: string;
};

const INITIAL_FORM: UnitForm = {
  name: '',
};

export default function AdminOperationalUnitsPage() {
  const [units, setUnits] = useState<OperationalUnitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<UnitForm>(INITIAL_FORM);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UnitForm>(INITIAL_FORM);

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

  async function handleCreate() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await adminOperationalUnitCreate({
        name: form.name.trim(),
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
        <p className="mt-1 text-sm text-steel">Manage operational units for the public dashboard.</p>
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
          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal">Unit name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. TPG"
            />
          </div>

          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => void handleCreate()}
            isLoading={saving}
            disabled={!form.name.trim()}
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
              {units.map((unit) => (
                <div key={unit.id} className="flex items-center justify-between rounded-md border border-border-light bg-surface p-3">
                  {editingUnitId === unit.id ? (
                    <div className="w-full space-y-3">
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Unit name"
                      />
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
                          <Building2 className="h-5 w-5 text-steel" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-heading text-base font-semibold text-charcoal">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
