'use client';

import { Pencil, Plus, Trash2, FolderTree } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import {
  adminCategoriesList,
  adminCategoryDelete,
  adminCategoryCreate,
  adminCategoryUpdate,
  type CategoryItemWithMenuGroup,
} from '@/lib/admin-api';

const MENU_GROUPS = [
  { value: '', label: '— None (not in header submenu) —' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'sustainability', label: 'Sustainability' },
  { value: 'compliance', label: 'Compliance' },
];

function getAttr(c: { id: number; attributes?: Record<string, unknown> }, key: string): unknown {
  return (c.attributes && c.attributes[key]) ?? (c as Record<string, unknown>)[key];
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [list, setList] = useState<CategoryItemWithMenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    menuGroup: '' as string,
    isPublic: true,
    displayOrder: 0,
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminCategoriesList();
      setList((Array.isArray(data) ? data : []) as CategoryItemWithMenuGroup[]);
    } catch (e) {
      if (e instanceof Error && (e.message === 'Unauthorized' || e.message.includes('401'))) {
        router.replace('/admin/login');
        return;
      }
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const startEdit = (c: CategoryItemWithMenuGroup) => {
    setEditingId(c.id);
    setCreating(false);
    setForm({
      name: String(getAttr(c, 'name') ?? ''),
      slug: String(getAttr(c, 'slug') ?? ''),
      menuGroup: String(getAttr(c, 'menuGroup') ?? '') || '',
      isPublic: Boolean(getAttr(c, 'isPublic') ?? true),
      displayOrder: Number(getAttr(c, 'displayOrder') ?? 0),
    });
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setForm({ name: '', slug: '', menuGroup: '', isPublic: true, displayOrder: list.length });
  };

  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
  };

  const saveForm = async () => {
    try {
      if (creating) {
        await adminCategoryCreate({
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
          menuGroup: form.menuGroup || undefined,
          isPublic: form.isPublic,
          displayOrder: form.displayOrder,
        });
      } else if (editingId) {
        await adminCategoryUpdate(editingId, {
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
          menuGroup: form.menuGroup || null,
          isPublic: form.isPublic,
          displayOrder: form.displayOrder,
        });
      }
      cancelForm();
      fetchList();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category? Documents using it may be affected.')) return;
    setDeleteId(id);
    try {
      await adminCategoryDelete(id);
      fetchList();
      if (editingId === id) cancelForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-h1 text-charcoal flex items-center gap-2">
            <FolderTree className="h-8 w-8 text-primary" />
            Categories
          </h1>
          <p className="mt-1 text-steel">
            Manage categories for documents and the public site header. Set <strong>Menu group</strong> to show under Procedure, Sustainability, or Compliance.
          </p>
        </div>
        {!creating && !editingId && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={startCreate}>
            New category
          </Button>
        )}
      </div>

      {(creating || editingId) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{creating ? 'New category' : 'Edit category'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. SOP (Standard Operating Procedures)"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="e.g. sop"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">Menu group (public header)</label>
              <select
                className="input w-full"
                value={form.menuGroup}
                onChange={(e) => setForm((p) => ({ ...p, menuGroup: e.target.value }))}
              >
                {MENU_GROUPS.map((g) => (
                  <option key={g.value || 'none'} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={form.isPublic}
                onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))}
                className="rounded border-border-medium"
              />
              <label htmlFor="isPublic" className="text-sm text-charcoal">
                Public (show in public navigation when menu group is set)
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">Display order</label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm((p) => ({ ...p, displayOrder: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveForm} disabled={!form.name.trim() || !form.slug.trim()}>
                {creating ? 'Create' : 'Update'}
              </Button>
              <Button variant="outline" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-steel">Loading…</div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-steel">No categories yet. Create one to drive the public header menu.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-medium text-steel">
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Slug</th>
                    <th className="pb-3 pr-4 font-medium">Menu group</th>
                    <th className="pb-3 pr-4 font-medium">Order</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id} className="border-b border-border-light">
                      <td className="py-3 pr-4 font-medium text-charcoal">{String(getAttr(c, 'name'))}</td>
                      <td className="py-3 pr-4 text-steel">{String(getAttr(c, 'slug'))}</td>
                      <td className="py-3 pr-4 text-steel">{String(getAttr(c, 'menuGroup') || '—')}</td>
                      <td className="py-3 pr-4 text-steel">{Number(getAttr(c, 'displayOrder'))}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Pencil className="h-4 w-4" />}
                            onClick={() => startEdit(c)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="h-4 w-4" />}
                            onClick={() => handleDelete(c.id)}
                            disabled={deleteId === c.id}
                            className="text-danger hover:bg-danger/10"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
