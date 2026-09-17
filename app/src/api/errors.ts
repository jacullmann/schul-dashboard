import { isAxiosError } from 'axios';

/**
 * Reads the `{ error }` message the API returns on failure, falling back when
 * the request failed before reaching the server or carried no message.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError<{ error?: unknown }>(err)) {
    const message = err.response?.data?.error;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}
