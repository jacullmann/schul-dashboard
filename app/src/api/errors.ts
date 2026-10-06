import { isAxiosError, isCancel } from 'axios';

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

const UNAUTHORIZED = 401;
const TOO_MANY_REQUESTS = 429;
const FIRST_SERVER_ERROR = 500;

/** Whether the API refused the request for being one too many. */
export function isRateLimited(err: unknown): boolean {
  return apiErrorStatus(err) === TOO_MANY_REQUESTS;
}

/** Whether the API rejected the session itself, the only failure that means signed out. */
export function isSessionRejected(err: unknown): boolean {
  return apiErrorStatus(err) === UNAUTHORIZED;
}

/**
 * Whether the request failed for a reason that passes on its own: no answer at
 * all (offline, or the API restarting during a deploy), a server error or a
 * rate limit. Such a failure says nothing about the session.
 */
export function isTransientFailure(err: unknown): boolean {
  if (!isAxiosError(err) || isCancel(err)) return false;
  const status = err.response?.status;
  return (
    status === undefined ||
    status === TOO_MANY_REQUESTS ||
    status >= FIRST_SERVER_ERROR
  );
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError<{ error?: unknown }>(err)) {
    const message = err.response?.data?.error;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}
