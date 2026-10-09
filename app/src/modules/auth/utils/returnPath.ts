/**
 * Only paths within the app. "//host" and "/\host" are both read by browsers
 * as another origin, so neither may be followed after sign-in.
 */
export function isAppPath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.startsWith('/\\')
  );
}

/**
 * A path remembered in this tab across a round trip that may leave the app
 * (Google, a full reload). sessionStorage, not localStorage: the round trip
 * stays in this tab.
 */
export function createReturnPath(storageKey: string) {
  function save(path: string): void {
    if (!isAppPath(path)) return;
    try {
      sessionStorage.setItem(storageKey, path);
    } catch {
      // Storage unavailable: the user lands on the start page instead.
    }
  }

  function clear(): void {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Storage unavailable: nothing to clear.
    }
  }

  function consume(): string | null {
    try {
      const path = sessionStorage.getItem(storageKey);
      sessionStorage.removeItem(storageKey);
      return isAppPath(path) ? path : null;
    } catch {
      return null;
    }
  }

  return { save, clear, consume };
}
