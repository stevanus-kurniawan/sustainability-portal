'use client';

import { Pencil, Plus, Trash2, Layers, ArrowLeft, FileText, Award } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import {
  adminCategoryGet,
  adminSubContentsList,
  adminSubContentCreate,
  adminSubContentUpdate,
  adminSubContentDelete,
  type CategoryItemWithMenuGroup,
  type SubContentItem,
} from '@/lib/admin-api';

function getAttr(item: { id: number; attributes?: Record<string, unknown> }, key: string): unknown {
  return (item.attributes && item.attributes[key]) ?? (item as Record<string, unknown>)[key];
}

/** Maps category slug to the admin list URL for the Document button. Returns { href, label }. */
function getDocumentListUrl(categorySlug: string, categoryId: number, subContentId: number): { href: string; label: string } {
  const slug = String(categorySlug).toLowerCase();
  const params = `categoryId=${categoryId}&subContentId=${subContentId}`;
  const docParams = `/admin/documents?${params}`;
  switch (slug) {
    case 'certificate':
      return { href: `/admin/certifications?sub=${categoryId}_${subContentId}`, label: 'Certificates' };
    case 'sop':
      return { href: `/admin/procedure/sop?${params}`, label: 'Documents' };
    case 'form':
      return { href: `/admin/procedure/forms?${params}`, label: 'Documents' };
    case 'national':
      return { href: `/admin/compliance/national?${params}`, label: 'Documents' };
    case 'international':
      return { href: `/admin/compliance/international?${params}`, label: 'Documents' };
    case 'standard':
      return { href: `/admin/compliance/standard?${params}`, label: 'Documents' };
    case 'sustainability-report':
      return { href: `/admin/sustainability/reports?${params}`, label: 'Documents' };
    case 'licenses':
    case 'license':
      return { href: `/admin/licenses?categoryId=${categoryId}&subContentId=${subContentId}`, label: 'Licenses' };
    default:
      return { href: docParams, label: 'Documents' };
  }
}

export default function AdminSubContentsPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = Number(params.id);
  const [category, setCategory] = useState<CategoryItemWithMenuGroup | null>(null);
  const [list, setList] = useState<SubContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    order: 0,
    description: '',
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!categoryId || Number.isNaN(categoryId)) return;
    setLoading(true);
    try {
      const [catRes, subRes] = await Promise.all([
        adminCategoryGet(categoryId),
        adminSubContentsList(categoryId),
      ]);
      setCategory(catRes ?? null);
      setList(Array.isArray(subRes?.data) ? subRes.data : []);
    } catch (e) {
      if (e instanceof Error && (e.message === 'Unauthorized' || e.message.includes('401'))) {
        router.replace('/admin/login');
        return;
      }
      setCategory(null);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startEdit = (s: SubContentItem) => {
    setEditingId(s.id);
    setCreating(false);
    setForm({
      title: String(getAttr(s, 'title') ?? ''),
      slug: String(getAttr(s, 'slug') ?? ''),
      order: Number(getAttr(s, 'order') ?? 0),
      description: String(getAttr(s, 'description') ?? '') || '',
    });
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setForm({ title: '', slug: '', order: list.length, description: '' });
  };

  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
  };

  const saveForm = async () => {
    try {
      if (creating) {
        await adminSubContentCreate(categoryId, {
          title: form.title.trim(),
          slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
          order: form.order,
          description: form.description.trim() || null,
        });
      } else if (editingId) {
        await adminSubContentUpdate(categoryId, editingId, {
          title: form.title.trim(),
          slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
          order: form.order,
          description: form.description.trim() || null,
        });
      }
      cancelForm();
      fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this sub-content? Documents under it may be unlinked.')) return;
    setDeleteId(id);
    try {
      await adminSubContentDelete(categoryId, id);
      fetchData();
      if (editingId === id) cancelForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading && !category) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="py-12 text-center text-steel">Loading…</div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-danger">Category not found.</p>
        <Link href="/admin/categories" className="mt-4 inline-block text-primary hover:underline">
          ← Back to Categories
        </Link>
      </div>
    );
  }

  const categoryName = String(getAttr(category, 'name') ?? 'Category');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/categories"
            className="mb-2 inline-flex items-center gap-1 text-sm text-steel hover:text-charcoal"
          >
            <ArrowLeft className="h-4 w-4" /> Categories
          </Link>
          <h1 className="font-heading text-h1 text-charcoal flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" />
            Sub-contents: {categoryName}
          </h1>
          <p className="mt-1 text-steel">
            Manage sub-content items (e.g. Sites) under this category. Documents are attached to these items.
          </p>
        </div>
        {!creating && !editingId && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={startCreate}>
            New sub-content
          </Button>
        )}
      </div>

      {(creating || editingId) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{creating ? 'New sub-content' : 'Edit sub-content'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Jakarta"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="e.g. jakarta"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">Order</label>
              <Input
                type="number"
                value={form.order}
                onChange={(e) => setForm((p) => ({ ...p, order: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">Description (optional)</label>
              <textarea
                className="input w-full min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Short description"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveForm} disabled={!form.title.trim() || !form.slug.trim()}>
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
            <div className="py-12 text-center text-steel">
              No sub-contents yet. Create one to group documents (e.g. by site).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-medium text-steel">
                    <th className="pb-3 pr-4 font-medium">Title</th>
                    <th className="pb-3 pr-4 font-medium">Slug</th>
                    <th className="pb-3 pr-4 font-medium">Order</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id} className="border-b border-border-light">
                      <td className="py-3 pr-4 font-medium text-charcoal">{String(getAttr(s, 'title'))}</td>
                      <td className="py-3 pr-4 text-steel">{String(getAttr(s, 'slug'))}</td>
                      <td className="py-3 pr-4 text-steel">{Number(getAttr(s, 'order'))}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {(() => {
                            const { href, label } = getDocumentListUrl(
                              String(getAttr(category, 'slug')),
                              categoryId,
                              s.id,
                            );
                            const Icon = label === 'Certificates' ? Award : FileText;
                            return (
                              <Link href={href}>
                                <Button variant="ghost" size="sm" leftIcon={<Icon className="h-4 w-4" />}>
                                  {label}
                                </Button>
                              </Link>
                            );
                          })()}
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Pencil className="h-4 w-4" />}
                            onClick={() => startEdit(s)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="h-4 w-4" />}
                            onClick={() => handleDelete(s.id)}
                            disabled={deleteId === s.id}
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
