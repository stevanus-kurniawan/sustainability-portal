/**
 * Helpers for Strapi-compatible API responses (id + attributes) and pagination.
 */

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
