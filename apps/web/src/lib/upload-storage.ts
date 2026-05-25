import {
  resolveStorageFolderPath,
  type ProcedureScopeStorage,
  type StorageSection,
  type SustainabilityStorageType,
} from '@slms/shared';

export interface DocumentUploadStorageContext {
  type: 'POLICY' | 'GRIEVANCE' | 'GENERAL';
  updatesMode?: boolean;
  procedureUnified?: boolean;
  procedureScope?: ProcedureScopeStorage | '';
  operationalUnitSlug?: string;
  categorySlug?: string;
  regulationKind?: 'NATIONAL' | 'INTERNATIONAL' | '';
}

export interface CertificateLicenseUploadStorageContext {
  kind: 'certificate' | 'license';
  operationalUnitSlug?: string;
}

/** Build multipart form fields for POST /api/admin/upload/upload. */
export function buildUploadStorageFormFields(
  context: DocumentUploadStorageContext | CertificateLicenseUploadStorageContext,
): Record<string, string> | null {
  if ('kind' in context) {
    if (!context.operationalUnitSlug) return null;
    return {
      storageSection: context.kind,
      operationalUnitFolder: context.operationalUnitSlug,
    };
  }

  if (context.updatesMode) {
    return { storageSection: 'updates' };
  }

  if (context.procedureUnified) {
    if (context.procedureScope === 'SUSTAINABILITY') {
      return { storageSection: 'procedure', procedureScope: 'SUSTAINABILITY' };
    }
    if (context.procedureScope === 'OPERATIONAL_UNIT') {
      if (!context.operationalUnitSlug) return null;
      return {
        storageSection: 'procedure',
        procedureScope: 'OPERATIONAL_UNIT',
        operationalUnitFolder: context.operationalUnitSlug,
      };
    }
    return null;
  }

  if (context.type === 'POLICY') {
    return { storageSection: 'sustainability', sustainabilityType: 'policy' };
  }
  if (context.type === 'GRIEVANCE') {
    return { storageSection: 'sustainability', sustainabilityType: 'grievance' };
  }
  if (context.regulationKind) {
    return { storageSection: 'sustainability', sustainabilityType: 'regulation' };
  }

  const slug = context.categorySlug?.toLowerCase() ?? '';
  if (slug === 'sustainability-report') {
    return { storageSection: 'sustainability', sustainabilityType: 'sustainability-report' };
  }
  if (slug === 'standard') {
    return { storageSection: 'sustainability', sustainabilityType: 'standards' };
  }

  return null;
}

export function describeUploadStoragePath(
  fields: Record<string, string>,
): string | null {
  const section = fields.storageSection as StorageSection | undefined;
  if (!section) return null;
  return resolveStorageFolderPath({
    section,
    sustainabilityType: fields.sustainabilityType as SustainabilityStorageType | undefined,
    procedureScope: fields.procedureScope as ProcedureScopeStorage | undefined,
    operationalUnitFolder: fields.operationalUnitFolder,
  });
}

/** Upload a file via the Next.js admin upload proxy with Synology folder context. */
export async function uploadAdminFile(
  file: File,
  storageFields: Record<string, string> | null,
): Promise<{ key: string }> {
  const formData = new FormData();
  formData.set('file', file, file.name);
  if (storageFields) {
    for (const [k, v] of Object.entries(storageFields)) {
      formData.set(k, v);
    }
  }

  const uploadRes = await fetch('/api/admin/upload/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new Error((data as { message?: string }).message || 'Upload failed');
  }
  const { key } = data as { key?: string | null; message?: string };
  if (!key) {
    throw new Error((data as { message?: string }).message || 'Upload not configured');
  }
  return { key };
}

export function uploadStorageContextError(
  context: DocumentUploadStorageContext | CertificateLicenseUploadStorageContext,
): string {
  if ('kind' in context) {
    return 'Please select an operational unit before uploading a file.';
  }
  if (context.procedureUnified) {
    if (!context.procedureScope) {
      return 'Please select a source (Holding Company or Operational Unit) before uploading.';
    }
    if (context.procedureScope === 'OPERATIONAL_UNIT') {
      return 'Please select an operational unit before uploading.';
    }
  }
  return 'Unable to determine storage folder for this upload.';
}
