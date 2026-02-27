import { VALIDATION } from './validation';

describe('VALIDATION.PASSWORD', () => {
  const { PATTERN, MIN_LENGTH } = VALIDATION.PASSWORD;

  it('enforces minimum length', () => {
    expect(MIN_LENGTH).toBeGreaterThanOrEqual(10);
    expect(PATTERN.test('Aa1!aaaaa')).toBe(false); // 9 chars
    expect(PATTERN.test('Aa1!aaaaaa')).toBe(true); // 10 chars
  });

  it('requires upper, lower, number, and special character', () => {
    expect(PATTERN.test('aaaaaaaaaa')).toBe(false); // no upper/number/special
    expect(PATTERN.test('AAAAAAAAAA')).toBe(false); // no lower/number/special
    expect(PATTERN.test('AaAaAaAaAa')).toBe(false); // no number/special
    expect(PATTERN.test('Aa1Aa1Aa1A')).toBe(false); // no special
    expect(PATTERN.test('Aa1!aaaaaa')).toBe(true);
  });
});

