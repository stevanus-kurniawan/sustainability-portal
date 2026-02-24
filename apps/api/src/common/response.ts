/**
 * Helpers for Strapi-compatible API responses (id + attributes) and pagination.
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export function paginationMeta(
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  const pageCount = Math.ceil(total / pageSize) || 1;
  return {
    page,
    pageSize,
    pageCount,
    total,
  };
}

/** Clamp page and pageSize for list queries to prevent abuse. */
export function clampPagination(
  page?: number,
  pageSize?: number,
): { page: number; pageSize: number } {
  const p = Math.max(1, Number(page) || DEFAULT_PAGE);
  const ps = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE),
  );
  return { page: p, pageSize: ps };
}

/** Wrap list in { data, meta } for public list endpoints */
export function wrapPaginated<T>(items: T[], meta: PaginationMeta) {
  return { data: items, meta: { pagination: meta } };
}

/** Strapi-like single resource: { id, attributes } */
export function toStrapiLike<T extends Record<string, unknown>>(
  id: number | string,
  attributes: T,
) {
  return { id, attributes };
}

/** Strapi-like list (for responses that already use id/attributes per item) */
export function wrapData<T>(data: T[]) {
  return { data };
}
