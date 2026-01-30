import { DocumentType } from '@prisma/client';
import { toStrapiLike } from './response';

function fileUrl(fileKey: string | null, baseUrl: string): string {
  if (!fileKey || !baseUrl) return '';
  return baseUrl.endsWith('/') ? `${baseUrl}${fileKey}` : `${baseUrl}/${fileKey}`;
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
  type: DocumentType;
  description: string | null;
  externalLink: string | null;
  isPublic: boolean;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  category: { id: number; name: string; slug: string; isPublic: boolean; displayOrder: number } | null;
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

export function mapDocumentToStrapi(doc: DocumentWithRelations, baseUrl?: string) {
  const base = baseUrl ?? getFileBaseUrl();
  return toStrapiLike(doc.id, {
    title: doc.title,
    type: doc.type,
    description: doc.description,
    externalLink: (doc as { externalLink?: string | null }).externalLink ?? null,
    isPublic: doc.isPublic,
    isPublished: doc.isPublished,
    publishedAt: doc.publishedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
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
                    url: fileUrl(doc.currentVersion.fileKey, base),
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
