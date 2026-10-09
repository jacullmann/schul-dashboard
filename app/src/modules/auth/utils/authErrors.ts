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
} as const;

const MESSAGE_KEYS: Record<string, string> = {
  [AuthErrorCode.InvalidCredentials]: 'auth.errors.invalid_credentials',
  [AuthErrorCode.EmailAlreadyRegistered]:
    'auth.errors.email_already_registered',
  [AuthErrorCode.EmailNotVerified]: 'auth.errors.email_not_verified',
  [AuthErrorCode.EmailThrottled]: 'auth.errors.email_throttled',
  [AuthErrorCode.LastSignInMethod]: 'auth.errors.last_sign_in_method',
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
