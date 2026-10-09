import { describe, expect, it } from 'vitest';
import { birthYearIssue, needsGuardianConsent } from './age';

const THIS_YEAR = 2026;

describe('birthYearIssue', () => {
  it('asks for a birth year', () => {
    expect(birthYearIssue(null, THIS_YEAR)).toBe('missing');
  });

  it('rejects years in the future, implausibly old years and non-integers', () => {
    expect(birthYearIssue(THIS_YEAR + 1, THIS_YEAR)).toBe('invalid');
    expect(birthYearIssue(THIS_YEAR - 121, THIS_YEAR)).toBe('invalid');
    expect(birthYearIssue(Number.NaN, THIS_YEAR)).toBe('invalid');
    expect(birthYearIssue(2010.5, THIS_YEAR)).toBe('invalid');
  });

  it('refuses anyone below the minimum age', () => {
    expect(birthYearIssue(THIS_YEAR - 12, THIS_YEAR)).toBe('too_young');
  });

  it('accepts the minimum age and older', () => {
    expect(birthYearIssue(THIS_YEAR - 13, THIS_YEAR)).toBeNull();
    expect(birthYearIssue(THIS_YEAR - 120, THIS_YEAR)).toBeNull();
  });
});

describe('needsGuardianConsent', () => {
  it('applies below sixteen only', () => {
    expect(needsGuardianConsent(THIS_YEAR - 15, THIS_YEAR)).toBe(true);
    expect(needsGuardianConsent(THIS_YEAR - 16, THIS_YEAR)).toBe(false);
  });
});
