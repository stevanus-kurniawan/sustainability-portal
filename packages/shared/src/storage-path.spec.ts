import { describe, expect, it } from 'vitest';
import {
  buildStorageFileKey,
  isValidStorageFileKey,
  resolveStorageFolderPath,
  sanitizeStorageFolderSegment,
} from './storage-path';

describe('storage-path', () => {
  it('maps procedure holding company folder', () => {
    expect(
      resolveStorageFolderPath({
        section: 'procedure',
        procedureScope: 'SUSTAINABILITY',
      }),
    ).toBe('Procedure/Holding Company');
  });

  it('maps procedure operational unit folder', () => {
    expect(
      resolveStorageFolderPath({
        section: 'procedure',
        procedureScope: 'OPERATIONAL_UNIT',
        operationalUnitFolder: 'plant-a',
      }),
    ).toBe('Procedure/Operational Unit/plant-a');
  });

  it('maps sustainability subfolders', () => {
    expect(
      resolveStorageFolderPath({ section: 'sustainability', sustainabilityType: 'policy' }),
    ).toBe('Sustainability/Policy');
    expect(
      resolveStorageFolderPath({
        section: 'sustainability',
        sustainabilityType: 'sustainability-report',
      }),
    ).toBe('Sustainability/Sustainability Report');
  });

  it('maps certificate and license operational unit folders', () => {
    expect(
      resolveStorageFolderPath({
        section: 'certificate',
        operationalUnitFolder: 'mill-1',
      }),
    ).toBe('Certificate/Operational Unit/mill-1');
    expect(
      resolveStorageFolderPath({
        section: 'license',
        operationalUnitFolder: 'mill-1',
      }),
    ).toBe('License/Operational Unit/mill-1');
  });

  it('maps updates folder without subfolder', () => {
    expect(resolveStorageFolderPath({ section: 'updates' })).toBe('Updates');
  });

  it('builds file keys under folder paths', () => {
    expect(buildStorageFileKey('Updates', 'abc.pdf')).toBe('Updates/abc.pdf');
    expect(buildStorageFileKey('Procedure/Holding Company', 'abc.pdf')).toBe(
      'Procedure/Holding Company/abc.pdf',
    );
  });

  it('validates legacy and synology file keys', () => {
    expect(isValidStorageFileKey('uploads/abc.pdf')).toBe(true);
    expect(isValidStorageFileKey('Updates/abc.pdf')).toBe(true);
    expect(isValidStorageFileKey('Procedure/Holding Company/abc.pdf')).toBe(true);
    expect(isValidStorageFileKey('Procedure/Holding Company/../etc/passwd')).toBe(false);
    expect(isValidStorageFileKey('random/path/file.pdf')).toBe(false);
  });

  it('sanitizes unsafe folder segments', () => {
    expect(sanitizeStorageFolderSegment('  mill/1  ')).toBe('mill1');
  });
});
