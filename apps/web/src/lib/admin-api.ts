/**
 * Admin API client – calls Next.js API routes with credentials (cookie).
 * Use for all admin CRUD. 401 should trigger redirect to /admin/login.
 */

const defaultOptions: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

export interface PaginationMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface DocumentItem {
  id: number;
  attributes: {
    title: string;
    type: string;
    description: string | null;
    isPublic: boolean;
    isPublished: boolean;
    publishedAt: string | null;
    createdAt: string;
    category: { data: { id: number; attributes: { name: string; slug: string } } | null };
    tags: { data: Array<{ id: number; attributes: { name: string; slug: string } }> };
    currentVersion: { data: unknown } | null;
  };
}

export interface CategoryItem {
  id: number;
  attributes: { name: string; slug: string; isPublic: boolean; displayOrder: number };
}

export interface ListResponse<T> {
  data: T[];
  meta?: { pagination?: PaginationMeta };
}

async function adminFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(path, { ...defaultOptions, ...options });
}

export async function adminDocumentsList(params: {
  page?: number;
  pageSize?: number;
  type?: string;
  search?: string;
  isPublished?: boolean;
  categoryId?: number;
}): Promise<ListResponse<DocumentItem>> {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set('page', String(params.page));
  if (params.pageSize != null) sp.set('pageSize', String(params.pageSize));
  if (params.type) sp.set('type', params.type);
  if (params.search) sp.set('search', params.search);
  if (params.isPublished !== undefined) sp.set('isPublished', String(params.isPublished));
  if (params.categoryId != null) sp.set('categoryId', String(params.categoryId));
  const res = await adminFetch(`/api/admin/documents?${sp.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}

export async function adminDocumentGet(id: number): Promise<DocumentItem | null> {
  const res = await adminFetch(`/api/admin/documents/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}

export async function adminDocumentCreate(body: {
  title: string;
  type: string;
  description?: string;
  externalLink?: string;
  isPublic?: boolean;
  isPublished?: boolean;
  categoryId?: number;
  tagIds?: number[];
  attachment?: { fileKey: string; fileName: string; mimeType?: string; fileSize?: number };
}): Promise<DocumentItem> {
  const res = await adminFetch('/api/admin/documents', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}

export async function adminDocumentUpdate(
  id: number,
  body: Partial<{
    title: string;
    type: string;
    description: string;
    externalLink: string | null;
    isPublic: boolean;
    isPublished: boolean;
    categoryId: number | null;
    tagIds: number[];
    attachment: { fileKey: string; fileName: string; mimeType?: string; fileSize?: number } | null;
  }>
): Promise<DocumentItem> {
  const res = await adminFetch(`/api/admin/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}

export async function adminDocumentDelete(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/documents/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204)
    throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
}

export async function adminCategoriesList(): Promise<CategoryItem[]> {
  const res = await adminFetch('/api/admin/categories', { cache: 'no-store' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

export interface CategoryItemWithMenuGroup extends CategoryItem {
  attributes: CategoryItem['attributes'] & { menuGroup?: string | null };
}

export async function adminCategoryGet(id: number): Promise<CategoryItemWithMenuGroup | null> {
  const res = await adminFetch(`/api/admin/categories/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}

export async function adminCategoryCreate(body: {
  name: string;
  slug: string;
  menuGroup?: string | null;
  isPublic?: boolean;
  displayOrder?: number;
}): Promise<CategoryItemWithMenuGroup> {
  const res = await adminFetch('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}

export async function adminCategoryUpdate(
  id: number,
  body: { name?: string; slug?: string; menuGroup?: string | null; isPublic?: boolean; displayOrder?: number }
): Promise<CategoryItemWithMenuGroup> {
  const res = await adminFetch(`/api/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}

export async function adminCategoryDelete(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204)
    throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
}

export async function adminCertificationsList(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<ListResponse<unknown>> {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set('page', String(params.page));
  if (params.pageSize != null) sp.set('pageSize', String(params.pageSize));
  if (params.search) sp.set('search', params.search);
  if (params.status) sp.set('status', params.status);
  const res = await adminFetch(`/api/admin/certifications?${sp.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}

export async function adminLicensesList(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<ListResponse<unknown>> {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set('page', String(params.page));
  if (params.pageSize != null) sp.set('pageSize', String(params.pageSize));
  if (params.search) sp.set('search', params.search);
  if (params.status) sp.set('status', params.status);
  const res = await adminFetch(`/api/admin/licenses?${sp.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}

export async function adminGrievancesList(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  category?: string;
}): Promise<ListResponse<unknown>> {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set('page', String(params.page));
  if (params.pageSize != null) sp.set('pageSize', String(params.pageSize));
  if (params.status) sp.set('status', params.status);
  if (params.category) sp.set('category', params.category);
  const res = await adminFetch(`/api/admin/grievances?${sp.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
  return res.json();
}
