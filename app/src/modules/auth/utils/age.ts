/** Younger than this, no account can be created. */
export const MIN_AGE = 13;

/** Younger than this, a guardian has to consent to the account. */
export const GUARDIAN_CONSENT_BELOW_AGE = 16;

const MAX_AGE = 120;

export type BirthYearIssue = 'missing' | 'invalid' | 'too_young';

export interface AgeDeclaration {
  birthYear: number;
  guardianConsent: boolean;
}

export function birthYearIssue(
  birthYear: number | null,
  currentYear: number,
): BirthYearIssue | null {
  if (birthYear === null) return 'missing';
  if (
    !Number.isInteger(birthYear) ||
    birthYear > currentYear ||
    birthYear < currentYear - MAX_AGE
  ) {
    return 'invalid';
  }
  if (currentYear - birthYear < MIN_AGE) return 'too_young';
  return null;
}

export function needsGuardianConsent(
  birthYear: number,
  currentYear: number,
): boolean {
  return currentYear - birthYear < GUARDIAN_CONSENT_BELOW_AGE;
}
