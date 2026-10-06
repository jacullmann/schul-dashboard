import { isAxiosError } from 'axios';

/**
 * Reads the `{ error }` message the API returns on failure, falling back when
 * the request failed before reaching the server or carried no message.
 */
/** The machine-readable `code` some API errors carry next to their message. */
export function apiErrorCode(err: unknown): string | undefined {
  if (!isAxiosError<{ code?: unknown }>(err)) return undefined;
  const code = err.response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}

export function apiErrorStatus(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined;
}

const TOO_MANY_REQUESTS = 429;

/** Whether the API refused the request for being one too many. */
export function isRateLimited(err: unknown): boolean {
  return apiErrorStatus(err) === TOO_MANY_REQUESTS;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError<{ error?: unknown }>(err)) {
    const message = err.response?.data?.error;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}
