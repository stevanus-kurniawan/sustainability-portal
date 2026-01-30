/**
 * Public API client for SLMS (migrated from apps/web-public)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface PaginationMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: PaginationMeta;
  };
}

interface FetchOptions {
  cache?: RequestCache;
  revalidate?: number;
  tags?: string[];
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  const { revalidate, tags } = options;

  const fetchOptions: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (revalidate !== undefined || tags) {
    fetchOptions.next = {};
    if (revalidate !== undefined) fetchOptions.next.revalidate = revalidate;
    if (tags) fetchOptions.next.tags = tags;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Types

export interface Category {
  id: number;
  attributes: {
    name: string;
    slug: string;
    isPublic: boolean;
    displayOrder: number;
  };
}

export interface Tag {
  id: number;
  attributes: {
    name: string;
    slug: string;
  };
}

export interface DocumentFile {
  id: number;
  attributes: {
    name: string;
    url: string;
    mime: string;
    size: number;
  };
}

export interface DocumentVersion {
  id: number;
  attributes: {
    versionNo: number;
    file: { data: DocumentFile };
    approvalStatus: string;
    validFrom: string;
    validTo: string;
  };
}

export interface Document {
  id: number;
  attributes: {
    title: string;
    type: string;
    description: string;
    isPublic: boolean;
    isPublished: boolean;
    publishedAt: string;
    createdAt: string;
    category: { data: Category | null };
    tags: { data: Tag[] };
    currentVersion: { data: DocumentVersion | null };
  };
}

export interface Certification {
  id: number;
  attributes: {
    name: string;
    issuer: string;
    certificateNo: string;
    issuedDate: string;
    expiryDate: string;
    status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
    document: { data: Document | null };
  };
}

export interface License {
  id: number;
  attributes: {
    name: string;
    authority: string;
    licenseNo: string;
    issuedDate: string;
    expiryDate: string;
    status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
    document: { data: Document | null };
  };
}

export interface GrievanceCase {
  id: number;
  attributes: {
    caseNo: string;
    status: 'OPEN' | 'IN_REVIEW' | 'CLOSED';
    category: string;
    receivedDate: string;
    publicSummary: string;
  };
}

export interface TraceabilityEntity {
  id: number;
  attributes: {
    entityType: 'FACTORY' | 'SUPPLIER' | 'SITE';
    name: string;
    code: string;
    region: string;
  };
}

export interface TraceabilityRecord {
  id: number;
  attributes: {
    recordType: 'AUDIT' | 'CHAIN_OF_CUSTODY' | 'ORIGIN';
    recordDate: string;
    isPublic: boolean;
    entity: { data: TraceabilityEntity };
    evidenceDocument: { data: Document | null };
  };
}

// Navigation (public header menu from API)
export interface NavItemLink {
  label: string;
  href: string;
}
export interface NavItemWithChildren {
  label: string;
  children: NavItemLink[];
}
export type NavItem = NavItemLink | NavItemWithChildren;

export function isNavItemWithChildren(item: NavItem): item is NavItemWithChildren {
  return 'children' in item && Array.isArray((item as NavItemWithChildren).children);
}

export async function getNavigation(): Promise<{ items: NavItem[] }> {
  const response = await fetch(`${API_BASE_URL}/public/navigation`, {
    next: { revalidate: 300, tags: ['navigation'] },
  });
  if (!response.ok) throw new Error('Failed to fetch navigation');
  return response.json();
}

// Public API functions

export async function getCategories(): Promise<Category[]> {
  const response = await fetchApi<Category[]>('/public/categories', {
    revalidate: 3600,
    tags: ['categories'],
  });
  return response.data || [];
}

export async function getTags(): Promise<Tag[]> {
  const response = await fetchApi<Tag[]>('/public/tags', {
    revalidate: 3600,
    tags: ['tags'],
  });
  return response.data || [];
}

export async function getPolicies(params?: {
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<Document[]>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const query = searchParams.toString();
  return fetchApi<Document[]>(`/public/policies${query ? `?${query}` : ''}`, {
    revalidate: 300,
    tags: ['policies'],
  });
}

export async function getCertifications(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}): Promise<ApiResponse<Certification[]>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return fetchApi<Certification[]>(`/public/certifications${query ? `?${query}` : ''}`, {
    revalidate: 300,
    tags: ['certifications'],
  });
}

export async function getLicenses(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}): Promise<ApiResponse<License[]>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return fetchApi<License[]>(`/public/licenses${query ? `?${query}` : ''}`, {
    revalidate: 300,
    tags: ['licenses'],
  });
}

export async function getLibrary(params?: {
  page?: number;
  pageSize?: number;
  category?: string;
  tags?: string;
  type?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<ApiResponse<Document[]>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.category) searchParams.set('category', params.category);
  if (params?.tags) searchParams.set('tags', params.tags);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const query = searchParams.toString();
  return fetchApi<Document[]>(`/public/library${query ? `?${query}` : ''}`, {
    revalidate: 60,
    tags: ['library'],
  });
}

export async function getDocument(id: number): Promise<Document | null> {
  try {
    const response = await fetchApi<Document>(`/public/library/${id}`, {
      revalidate: 300,
      tags: [`document-${id}`],
    });
    return response.data;
  } catch {
    return null;
  }
}

export async function getGrievances(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  category?: string;
}): Promise<ApiResponse<GrievanceCase[]>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.category) searchParams.set('category', params.category);

  const query = searchParams.toString();
  return fetchApi<GrievanceCase[]>(`/public/grievances${query ? `?${query}` : ''}`, {
    revalidate: 300,
    tags: ['grievances'],
  });
}

export async function getTraceability(params?: {
  page?: number;
  pageSize?: number;
  entityType?: string;
  recordType?: string;
  search?: string;
}): Promise<ApiResponse<TraceabilityRecord[]>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.entityType) searchParams.set('entityType', params.entityType);
  if (params?.recordType) searchParams.set('recordType', params.recordType);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return fetchApi<TraceabilityRecord[]>(`/public/traceability${query ? `?${query}` : ''}`, {
    revalidate: 300,
    tags: ['traceability'],
  });
}

export async function getTraceabilityEntities(params?: {
  page?: number;
  pageSize?: number;
  entityType?: string;
  search?: string;
}): Promise<ApiResponse<TraceabilityEntity[]>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.entityType) searchParams.set('entityType', params.entityType);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return fetchApi<TraceabilityEntity[]>(`/public/traceability/entities${query ? `?${query}` : ''}`, {
    revalidate: 300,
    tags: ['traceability-entities'],
  });
}

