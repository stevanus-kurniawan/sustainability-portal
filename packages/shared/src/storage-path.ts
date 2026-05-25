import {
  PROCEDURE_SCOPES,
  STORAGE_FOLDERS,
  STORAGE_SECTIONS,
  SUSTAINABILITY_STORAGE_TYPES,
  type ProcedureScopeStorage,
  type StorageSection,
  type SustainabilityStorageType,
} from './constants/storage';

export interface StorageFolderInput {
  section: StorageSection;
  sustainabilityType?: SustainabilityStorageType;
  procedureScope?: ProcedureScopeStorage;
  /** Operational unit slug or sanitized folder name. */
  operationalUnitFolder?: string;
}

const UNSAFE_PATH_CHARS = /[\\/:*?"<>|]/g;

/** Remove characters unsafe on Synology / Windows shared folders. */
export function sanitizeStorageFolderSegment(name: string): string {
  const cleaned = name.trim().replace(UNSAFE_PATH_CHARS, '').replace(/\.\./g, '');
  return cleaned.slice(0, 120) || 'unknown';
}

/** Remove characters unsafe in stored file names (spaces allowed). */
export function sanitizeStorageFileName(name: string): string {
  const cleaned = name.trim().replace(UNSAFE_PATH_CHARS, '').replace(/\.\./g, '');
  return cleaned.slice(0, 180) || 'document';
}

/** Build stored file name: `{original base} - {uuid}{ext}`. */
export function buildStorageFileName(originalName: string, fileId: string): string {
  const trimmed = (originalName || 'document').trim() || 'document';
  const lastDot = trimmed.lastIndexOf('.');
  const ext = lastDot > 0 ? trimmed.slice(lastDot) : '';
  const base = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  const safeBase = sanitizeStorageFileName(base);
  return `${safeBase} - ${fileId}${ext}`;
}

const SUSTAINABILITY_SUBFOLDER: Record<SustainabilityStorageType, string> = {
  policy: STORAGE_FOLDERS.policy,
  'sustainability-report': STORAGE_FOLDERS.sustainabilityReport,
  regulation: STORAGE_FOLDERS.regulation,
  standards: STORAGE_FOLDERS.standards,
  grievance: STORAGE_FOLDERS.grievance,
};

/** Resolve relative folder path (no trailing slash) where files should be stored. */
export function resolveStorageFolderPath(input: StorageFolderInput): string | null {
  const F = STORAGE_FOLDERS;

  switch (input.section) {
    case 'procedure':
      if (input.procedureScope === 'SUSTAINABILITY') {
        return `${F.procedure}/${F.holdingCompany}`;
      }
      if (input.procedureScope === 'OPERATIONAL_UNIT') {
        if (!input.operationalUnitFolder?.trim()) return null;
        const ou = sanitizeStorageFolderSegment(input.operationalUnitFolder);
        return `${F.procedure}/${F.operationalUnit}/${ou}`;
      }
      return null;

    case 'sustainability':
      if (!input.sustainabilityType) return null;
      return `${F.sustainability}/${SUSTAINABILITY_SUBFOLDER[input.sustainabilityType]}`;

    case 'certificate':
      if (!input.operationalUnitFolder?.trim()) return null;
      return `${F.certificate}/${F.operationalUnit}/${sanitizeStorageFolderSegment(input.operationalUnitFolder)}`;

    case 'license':
      if (!input.operationalUnitFolder?.trim()) return null;
      return `${F.license}/${F.operationalUnit}/${sanitizeStorageFolderSegment(input.operationalUnitFolder)}`;

    case 'updates':
      return F.updates;

    default:
      return null;
  }
}

export function buildStorageFileKey(folderPath: string, fileName: string): string {
  const base = folderPath.replace(/\/+$/, '');
  return `${base}/${fileName}`;
}

const VALID_FILE_NAME = /^[a-zA-Z0-9._\- ]+$/;

/** Validate file keys used in DB and public preview (legacy uploads/ + Synology layout). */
export function isValidStorageFileKey(key: string): boolean {
  if (!key || key.includes('..')) return false;

  if (/^uploads\/[a-zA-Z0-9._\- ]+$/.test(key)) return true;

  if (/^Updates\/[a-zA-Z0-9._\- ]+$/.test(key)) return true;

  const sectionRoots = [
    STORAGE_FOLDERS.procedure,
    STORAGE_FOLDERS.sustainability,
    STORAGE_FOLDERS.certificate,
    STORAGE_FOLDERS.license,
  ];
  for (const root of sectionRoots) {
    if (!key.startsWith(`${root}/`)) continue;
    const rest = key.slice(root.length + 1);
    if (!rest || rest.includes('..')) return false;
    const segments = rest.split('/');
    if (segments.length < 2) return false;
    const fileName = segments[segments.length - 1];
    if (!fileName || !VALID_FILE_NAME.test(fileName)) return false;
    return segments.every((seg) => seg.length > 0 && !seg.includes('..') && !UNSAFE_PATH_CHARS.test(seg));
  }

  return false;
}

export function parseStorageSection(value: string | undefined): StorageSection | null {
  if (!value) return null;
  return (STORAGE_SECTIONS as readonly string[]).includes(value) ? (value as StorageSection) : null;
}

export function parseSustainabilityStorageType(value: string | undefined): SustainabilityStorageType | null {
  if (!value) return null;
  return (SUSTAINABILITY_STORAGE_TYPES as readonly string[]).includes(value)
    ? (value as SustainabilityStorageType)
    : null;
}

export function parseProcedureScope(value: string | undefined): ProcedureScopeStorage | null {
  if (!value) return null;
  return (PROCEDURE_SCOPES as readonly string[]).includes(value) ? (value as ProcedureScopeStorage) : null;
}
