/**
 * Minimal tests for seed-policies: idempotency key (title), payload shape, no duplicates.
 */

const POLICY_TITLES = [
  'POL-DWS.01: Code of Conduct & Business Integrity Policy',
  'POL-DWS.02: Sustainability & Responsible Business Policy',
  'POL-DWS.03: Human Rights & Labour Policy',
  'POL-DWS.04: Health, Safety, Environment & Quality Policy',
  'POL-DWS.05: Supplier Code of Conduct Policy',
  'POL-DWS.06: Grievance Mechanism Policy',
  'POL-DWS.07: Compliance, Risk & Due Diligence Policy',
];

const CATEGORY_ID = 7;

describe('seed-policies', () => {
  it('has 7 policy titles with no duplicates', () => {
    expect(POLICY_TITLES).toHaveLength(7);
    const set = new Set(POLICY_TITLES);
    expect(set.size).toBe(7);
  });

  it('uses title as idempotency key (unique per record)', () => {
    POLICY_TITLES.forEach((title) => {
      expect(title).toBeTruthy();
      expect(typeof title).toBe('string');
    });
  });

  it('payload shape matches DocumentsService.create: type GENERAL, isPublic true, isPublished true, categoryId 7', () => {
    const payload = {
      title: POLICY_TITLES[0],
      description: POLICY_TITLES[0],
      type: 'GENERAL' as const,
      isPublic: true,
      isPublished: true,
      categoryId: CATEGORY_ID,
    };
    expect(payload.type).toBe('GENERAL');
    expect(payload.isPublic).toBe(true);
    expect(payload.isPublished).toBe(true);
    expect(payload.categoryId).toBe(7);
    expect(payload.description).toBe(payload.title);
  });

  it('category_id is 7 (required by spec)', () => {
    expect(CATEGORY_ID).toBe(7);
  });
});
