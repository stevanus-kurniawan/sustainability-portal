/** Top-level admin sections mapped to Synology root folders. */
export const STORAGE_SECTIONS = ['procedure', 'sustainability', 'certificate', 'license', 'updates'] as const;
export type StorageSection = (typeof STORAGE_SECTIONS)[number];

export const SUSTAINABILITY_STORAGE_TYPES = [
  'policy',
  'sustainability-report',
  'regulation',
  'standards',
  'grievance',
] as const;
export type SustainabilityStorageType = (typeof SUSTAINABILITY_STORAGE_TYPES)[number];

export const PROCEDURE_SCOPES = ['SUSTAINABILITY', 'OPERATIONAL_UNIT'] as const;
export type ProcedureScopeStorage = (typeof PROCEDURE_SCOPES)[number];

/** Folder names on Synology (display names). */
export const STORAGE_FOLDERS = {
  procedure: 'Procedure',
  sustainability: 'Sustainability',
  certificate: 'Certificate',
  license: 'License',
  updates: 'Updates',
  holdingCompany: 'Holding Company',
  operationalUnit: 'Operational Unit',
  policy: 'Policy',
  sustainabilityReport: 'Sustainability Report',
  regulation: 'Regulation',
  standards: 'Standards',
  grievance: 'Grievance',
} as const;
