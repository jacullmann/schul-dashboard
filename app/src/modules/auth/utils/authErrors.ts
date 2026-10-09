import i18n from '@/i18n';
import { apiErrorCode, apiErrorMessage, isReauthDeclined } from '@/api/errors';

/** Codes the API sends when signing in or changing sign-in methods fails. */
export const AuthErrorCode = {
  InvalidCredentials: 'INVALID_CREDENTIALS',
  EmailAlreadyRegistered: 'EMAIL_ALREADY_REGISTERED',
  EmailNotVerified: 'EMAIL_NOT_VERIFIED',
  IncorrectPassword: 'INCORRECT_PASSWORD',
  EmailThrottled: 'EMAIL_CODE_THROTTLED',
  LastSignInMethod: 'LAST_SIGN_IN_METHOD',
  InvalidBirthYear: 'INVALID_BIRTH_YEAR',
  TooYoung: 'TOO_YOUNG',
  GuardianConsentRequired: 'GUARDIAN_CONSENT_REQUIRED',
} as const;

const MESSAGE_KEYS: Record<string, string> = {
  [AuthErrorCode.InvalidCredentials]: 'auth.errors.invalid_credentials',
  [AuthErrorCode.EmailAlreadyRegistered]:
    'auth.errors.email_already_registered',
  [AuthErrorCode.EmailNotVerified]: 'auth.errors.email_not_verified',
  [AuthErrorCode.EmailThrottled]: 'auth.errors.email_throttled',
  [AuthErrorCode.LastSignInMethod]: 'auth.errors.last_sign_in_method',
  [AuthErrorCode.InvalidBirthYear]: 'auth.age.errors.birth_year_invalid',
  [AuthErrorCode.TooYoung]: 'auth.age.errors.too_young',
  [AuthErrorCode.GuardianConsentRequired]:
    'auth.age.errors.guardian_consent_missing',
};

/**
 * The message for a failed auth request in the user's language. Empty when
 * the user declined to confirm who they are: that was their choice.
 */
export function authErrorMessage(err: unknown, fallback: string): string {
  if (isReauthDeclined(err)) return '';
  const key = MESSAGE_KEYS[apiErrorCode(err) ?? ''];
  return key ? i18n.global.t(key) : apiErrorMessage(err, fallback);
}
