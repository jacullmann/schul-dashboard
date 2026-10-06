import { WebAuthnError } from '@simplewebauthn/browser';
import i18n from '@/i18n';
import { apiErrorCode, isRateLimited } from '@/api/errors';

/** Codes the API sends when a passkey ceremony fails. */
export const PasskeyErrorCode = {
  ChallengeExpired: 'PASSKEY_CHALLENGE_EXPIRED',
  Unknown: 'PASSKEY_UNKNOWN',
  Rejected: 'PASSKEY_REJECTED',
  RegistrationRejected: 'PASSKEY_REGISTRATION_REJECTED',
  AlreadyRegistered: 'PASSKEY_ALREADY_REGISTERED',
  LimitReached: 'PASSKEY_LIMIT_REACHED',
} as const;

const MESSAGE_KEYS: Record<string, string> = {
  [PasskeyErrorCode.ChallengeExpired]: 'auth.passkeys.errors.expired',
  [PasskeyErrorCode.Unknown]: 'auth.passkeys.errors.unknown',
  [PasskeyErrorCode.Rejected]: 'auth.passkeys.errors.rejected',
  [PasskeyErrorCode.RegistrationRejected]: 'auth.passkeys.errors.rejected',
  [PasskeyErrorCode.AlreadyRegistered]:
    'auth.passkeys.errors.already_registered',
  [PasskeyErrorCode.LimitReached]: 'auth.passkeys.errors.limit_reached',
};

/**
 * Whether the user closed the browser's passkey dialog, it timed out, or a
 * newer ceremony replaced it. Browsers report all of these alike on purpose,
 * so a site cannot tell whether a passkey exists; none of them is an error
 * worth showing.
 */
export function isPasskeyDismissed(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'NotAllowedError' || err.name === 'AbortError')
  );
}

export function passkeyErrorMessage(err: unknown, fallbackKey: string): string {
  const { t } = i18n.global;

  if (
    err instanceof WebAuthnError &&
    err.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED'
  ) {
    return t('auth.passkeys.errors.already_on_device');
  }

  const key = MESSAGE_KEYS[apiErrorCode(err) ?? ''];
  if (key) return t(key);

  // The rate limiter answers in plain text, so it carries no code.
  if (isRateLimited(err)) return t('auth.passkeys.errors.rate_limited');

  return t(fallbackKey);
}
