import { toStrapiLike } from './response';

function fileUrl(fileKey: string | null, baseUrl: string): string {
  if (!fileKey || !baseUrl) return '';
  return baseUrl.endsWith('/') ? `${baseUrl}${fileKey}` : `${baseUrl}/${fileKey}`;
}

/** Base URL the browser uses to call the API (e.g. with proxy: http://frontend:3000/api/v1). When set, file URLs point to API preview so downloads work. */
export function getApiPublicBaseUrl(): string {
  return process.env.API_PUBLIC_BASE_URL || '';
}

/** URL for the browser to preview or download a file. Prefer API preview URL so downloads work behind proxy / same-origin. */
function getFileUrlForResponse(fileKey: string | null, apiBaseOverride?: string): string {
  if (!fileKey) return '';
  const apiBase = apiBaseOverride ?? getApiPublicBaseUrl();
  if (apiBase) {
    const base = apiBase.replace(/\/$/, '');
    return `${base}/public/files/preview?key=${encodeURIComponent(fileKey)}`;
  }
  return fileUrl(fileKey, getFileBaseUrl());
}

export function getFileBaseUrl(): string {
  return (
    process.env.MINIO_PUBLIC_URL ||
    process.env.MINIO_ENDPOINT ||
    'http://localhost:9000/slms-docs'
  );
}

export type DocumentWithRelations = {
  id: number;
  title: string;
  // keep this in sync with schema.prisma DocumentType enum, but avoid a hard dependency
  // on generated Prisma enums so Docker builds remain stable.
  type: 'POLICY' | 'CERTIFICATION' | 'LICENSE' | 'GRIEVANCE' | 'TRACEABILITY' | 'GENERAL';
  description: string | null;
  externalLink: string | null;
  code?: string | null;
  documentType?: string | null;
  versionLabel?: string | null;
  effectiveDate?: Date | null;
  contentVersion?: 'V1' | 'V2';
  policyKind?: 'SOP' | 'FORM' | null;
  regulationKind?: 'NATIONAL' | 'INTERNATIONAL' | null;
  procedureScope?: 'SUSTAINABILITY' | 'OPERATIONAL_UNIT' | null;
  operationalUnitId?: number | null;
  isPublic: boolean;
  isPublished: boolean;
  publishedAt: Date | null;
  createdById?: string | null;
  updatedById?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
  deletedById?: string | null;
  deletedAt?: Date | null;
  category: { id: number; name: string; slug: string; isPublic: boolean; displayOrder: number } | null;
  operationalUnit?: { id: number; name: string; slug: string } | null;
  tags: { tag: { id: number; name: string; slug: string } }[];
  currentVersion: {
    id: number;
    versionNo: number;
    fileKey: string | null;
    fileName: string | null;
    mimeType: string | null;
    fileSize: number | null;
    approvalStatus: string;
    validFrom: Date | null;
    validTo: Date | null;
  } | null;
};

/**
 * Returns mapped document for API response, or null if doc is missing or soft-deleted.
 * Use this whenever exposing document data so deleted documents are never shown.
 */
export function documentDataForResponse(
  doc: (DocumentWithRelations & { isDeleted?: boolean }) | null | undefined,
  baseUrl?: string,
): ReturnType<typeof mapDocumentToStrapi> | null {
  if (!doc || doc.isDeleted) return null;
  return mapDocumentToStrapi(doc as DocumentWithRelations, baseUrl);
}

export function mapDocumentToStrapi(
  doc: DocumentWithRelations,
  baseUrl?: string,
  options: { includeAudit?: boolean } = {},
) {
  return toStrapiLike(doc.id, {
    title: doc.title,
    type: doc.type,
    description: doc.description,
    externalLink: (doc as { externalLink?: string | null }).externalLink ?? null,
    code: (doc as DocumentWithRelations).code ?? null,
    documentType: (doc as DocumentWithRelations).documentType ?? null,
    versionLabel: (doc as DocumentWithRelations).versionLabel ?? null,
    effectiveDate: (doc as DocumentWithRelations).effectiveDate?.toISOString() ?? null,
    contentVersion: (doc as DocumentWithRelations).contentVersion ?? 'V1',
    policyKind: (doc as DocumentWithRelations).policyKind ?? null,
    regulationKind: (doc as DocumentWithRelations).regulationKind ?? null,
    procedureScope: (doc as DocumentWithRelations).procedureScope ?? null,
    operationalUnitId: (doc as DocumentWithRelations).operationalUnitId ?? null,
    isPublic: doc.isPublic,
    isPublished: doc.isPublished,
    publishedAt: doc.publishedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    ...(options.includeAudit && {
      createdById: doc.createdById ?? null,
      updatedById: doc.updatedById ?? null,
      updatedAt: doc.updatedAt?.toISOString() ?? null,
    }),
    ...(doc.isDeleted !== undefined && {
      isDeleted: doc.isDeleted,
      deletedById: doc.deletedById ?? null,
      deletedAt: doc.deletedAt?.toISOString() ?? null,
    }),
    category: {
      data: doc.category
        ? toStrapiLike(doc.category.id, {
            name: doc.category.name,
            slug: doc.category.slug,
            isPublic: doc.category.isPublic,
            displayOrder: doc.category.displayOrder,
          })
        : null,
    },
    ...((doc as DocumentWithRelations).operationalUnit != null && {
      operationalUnit: {
        data: toStrapiLike((doc as DocumentWithRelations).operationalUnit!.id, {
          name: (doc as DocumentWithRelations).operationalUnit!.name,
          slug: (doc as DocumentWithRelations).operationalUnit!.slug,
        }),
      },
    }),
    ...((doc as { subContentId?: number | null }).subContentId != null && {
      subContentId: (doc as unknown as { subContentId: number }).subContentId,
    }),
    ...((doc as { subContent?: { id: number; title: string; slug: string } | null }).subContent != null && {
      subContent: {
        data: toStrapiLike((doc as unknown as { subContent: { id: number; title: string; slug: string } }).subContent.id, {
          title: (doc as unknown as { subContent: { title: string } }).subContent.title,
          slug: (doc as unknown as { subContent: { slug: string } }).subContent.slug,
        }),
      },
    }),
    tags: {
      data: doc.tags.map((t) => toStrapiLike(t.tag.id, { name: t.tag.name, slug: t.tag.slug })),
    },
    currentVersion: {
      data: doc.currentVersion
        ? toStrapiLike(doc.currentVersion.id, {
            versionNo: doc.currentVersion.versionNo,
            file: {
              data: doc.currentVersion.fileKey
                ? toStrapiLike(0, {
                    name: doc.currentVersion.fileName || 'file',
                    url: getFileUrlForResponse(doc.currentVersion.fileKey, baseUrl),
                    key: doc.currentVersion.fileKey,
                    mime: doc.currentVersion.mimeType || 'application/octet-stream',
                    size: doc.currentVersion.fileSize ?? 0,
                  })
                : null,
            },
            approvalStatus: doc.currentVersion.approvalStatus,
            validFrom: doc.currentVersion.validFrom?.toISOString() ?? null,
            validTo: doc.currentVersion.validTo?.toISOString() ?? null,
          })
        : null,
    },
  });
}
