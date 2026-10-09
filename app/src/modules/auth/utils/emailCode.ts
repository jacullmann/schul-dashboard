/** Every code we email is six digits, as `EmailCode` on the server issues it. */
export const EMAIL_CODE_LENGTH = 6;

/**
 * How long to wait before asking for another emailed code. Each request
 * sends another mail and counts towards the address's daily limit.
 */
export const RESEND_COOLDOWN_MS = 60_000;
