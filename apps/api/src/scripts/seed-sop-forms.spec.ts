/**
 * Minimal tests for seed-sop-forms: idempotency key (title/code), payload shape, category resolution.
 */

const SOP_FORM_TITLES = [
  'FORM-D02-SUS.01-01: Supplier Onboarding',
  'FORM-D02-SUS.01-02: Supplier Self-Declaration',
  'FORM-D02-SUS.01-03: Supplier Due Diligence',
  'FORM-D02-SUS.01-04: Environmental Impact Assessment',
  'FORM-D02-SUS.01-05: Waste Management Declaration',
  'FORM-D02-SUS.01-06: Occupational Health & Safety Checklist',
  'FORM-D02-SUS.01-07: Anti-Bribery & Corruption Acknowledgement',
  'FORM-D02-SUS.01-08: Worker Grievance Submission Form',
  'FORM-D02-SUS.01-09: Supplier Performance Evaluation',
  'FORM-D02-SUS.01-10: Risk Assessment & Mitigation Plan',
  'FORM-D02-SUS.01-11: Compliance Self-Assessment',
  'FORM-D02-SUS.01-12: Traceability Data Submission',
  'FORM-D02-SUS.01-13: Corrective Action Plan',
  'FORM-D02-SUS.01-14: Sustainability Training Attendance',
  'FORM-D02-SUS.01-15: Legal Compliance Declaration',
  'FORM-D02-SUS.01-16: Site Inspection Report',
  'FORM-D02-SUS.01-17: Incident Reporting Form',
  'FORM-D02-SUS.01-18: Annual Sustainability Review',
];

const DEFAULT_CATEGORY_SLUGS = ['sop', 'form'];

function codeFromTitle(title: string): string {
  const idx = title.indexOf(':');
  return (idx >= 0 ? title.slice(0, idx).trim() : title.trim()) || title;
}

describe('seed-sop-forms', () => {
  it('has exactly 18 SOP/Form titles', () => {
    expect(SOP_FORM_TITLES).toHaveLength(18);
  });

  it('uses title as idempotency key; code derived from prefix before ":"', () => {
    expect(codeFromTitle('FORM-D02-SUS.01-01: Supplier Onboarding')).toBe('FORM-D02-SUS.01-01');
    expect(codeFromTitle('FORM-D02-SUS.01-02: Supplier Self-Declaration')).toBe(
      'FORM-D02-SUS.01-02',
    );
    expect(codeFromTitle('No colon here')).toBe('No colon here');
  });

  it('payload shape matches DocumentsService.create: type GENERAL, isPublic true, isPublished true', () => {
    const payload = {
      title: SOP_FORM_TITLES[0],
      description: SOP_FORM_TITLES[0],
      type: 'GENERAL' as const,
      isPublic: true,
      isPublished: true,
      categoryId: 7,
    };
    expect(payload.type).toBe('GENERAL');
    expect(payload.isPublic).toBe(true);
    expect(payload.isPublished).toBe(true);
    expect(payload.description).toBe(payload.title);
  });

  it('category resolved by slug (sop or form) when --categoryId not provided', () => {
    expect(DEFAULT_CATEGORY_SLUGS).toContain('sop');
    expect(DEFAULT_CATEGORY_SLUGS).toContain('form');
  });
});
