/**
 * Remembers where the user was when they left to confirm an action with
 * Google, so the round trip brings them back there instead of to the start.
 *
 * sessionStorage, not localStorage: the round trip stays in this tab.
 */

const STORAGE_KEY = 'schul-dashboard:reauth-return';

/** Only paths within the app, never another origin ("//host"). */
function isAppPath(path: unknown): path is string {
  return (
    typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
  );
}

export function saveReauthReturn(path: string): void {
  if (!isAppPath(path)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // Storage unavailable: the user lands on the start page instead.
  }
}

export function consumeReauthReturn(): string | null {
  try {
    const path = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return isAppPath(path) ? path : null;
  } catch {
    return null;
  }
}
