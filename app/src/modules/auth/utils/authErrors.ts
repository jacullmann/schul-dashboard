import i18n from '@/i18n';
import {
  apiErrorCode,
  apiErrorMessage,
  isReauthDeclined,
  retryAfterMinutes,
} from '@/api/errors';

/** Codes the API sends when signing in or changing sign-in methods fails. */
export const AuthErrorCode = {
  InvalidCredentials: 'INVALID_CREDENTIALS',
  LoginLocked: 'LOGIN_LOCKED',
  EmailAlreadyRegistered: 'EMAIL_ALREADY_REGISTERED',
  EmailNotVerified: 'EMAIL_NOT_VERIFIED',
  IncorrectPassword: 'INCORRECT_PASSWORD',
  ReauthLocked: 'REAUTH_LOCKED',
  EmailThrottled: 'EMAIL_CODE_THROTTLED',
  LastSignInMethod: 'LAST_SIGN_IN_METHOD',
  InvalidBirthYear: 'INVALID_BIRTH_YEAR',
  TooYoung: 'TOO_YOUNG',
  GuardianConsentRequired: 'GUARDIAN_CONSENT_REQUIRED',
  RegistrationPaused: 'REGISTRATION_PAUSED',
  Shutdown: 'SHUTDOWN',
} as const;

const MESSAGE_KEYS: Record<string, string> = {
  [AuthErrorCode.InvalidCredentials]: 'auth.errors.invalid_credentials',
  [AuthErrorCode.EmailAlreadyRegistered]:
    'auth.errors.email_already_registered',
  [AuthErrorCode.EmailThrottled]: 'auth.errors.email_throttled',
  [AuthErrorCode.LastSignInMethod]: 'auth.errors.last_sign_in_method',
  [AuthErrorCode.InvalidBirthYear]: 'auth.age.errors.birth_year_invalid',
  [AuthErrorCode.TooYoung]: 'auth.age.errors.too_young',
  [AuthErrorCode.GuardianConsentRequired]:
    'auth.age.errors.guardian_consent_missing',
  [AuthErrorCode.RegistrationPaused]: 'auth.errors.registration_paused',
  [AuthErrorCode.Shutdown]: 'auth.errors.shutdown',
};

/**
 * The message for a failed auth request in the user's language. Empty when
 * the user declined to confirm who they are: that was their choice.
 */
export function authErrorMessage(err: unknown, fallback: string): string {
  if (isReauthDeclined(err)) return '';
  const code = apiErrorCode(err);
  if (code === AuthErrorCode.LoginLocked) {
    return i18n.global.t('auth.errors.login_locked', retryAfterMinutes(err));
  }
  const key = MESSAGE_KEYS[code ?? ''];
  return key ? i18n.global.t(key) : apiErrorMessage(err, fallback);
}
