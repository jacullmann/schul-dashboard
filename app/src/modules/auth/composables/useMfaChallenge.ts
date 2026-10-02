import { readonly, ref } from 'vue';
import { useEventListener, useTimeoutFn } from '@vueuse/core';
import { useMfa } from '@/modules/auth/composables/useMfa';

const MS_PER_SECOND = 1000;

/**
 * Follows the pending sign-in challenge and calls `onExpired` once it can no
 * longer be answered, so the user is sent back instead of typing codes into a
 * form the server will reject. The server stays the authority: the local
 * deadline only spares the user that dead end.
 */
export function useMfaChallenge(onExpired: () => void) {
  const { fetchMfaChallengeExpiresIn } = useMfa();

  const ready = ref(false);
  let expiresAt = Number.POSITIVE_INFINITY;
  let settled = false;

  // The server reports the time left rather than a timestamp, so a skewed
  // device clock cannot shift the deadline.
  const { start: startExpiryTimer, stop: stopExpiryTimer } = useTimeoutFn(
    expire,
    () => expiresAt - Date.now(),
    { immediate: false },
  );

  function settle(): void {
    settled = true;
    stopExpiryTimer();
  }

  function expire(): void {
    if (settled) return;
    settle();
    onExpired();
  }

  // Hidden tabs throttle timers, so the deadline is checked again on return.
  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() >= expiresAt) {
      expire();
    }
  });

  async function track(): Promise<void> {
    let expiresIn: number | null;
    try {
      expiresIn = await fetchMfaChallengeExpiresIn();
    } catch {
      // Without a deadline the form still works; submitting an expired
      // challenge is caught by the server.
      ready.value = true;
      return;
    }

    if (expiresIn === null) {
      expire();
      return;
    }

    expiresAt = Date.now() + expiresIn * MS_PER_SECOND;
    ready.value = true;
    startExpiryTimer();
  }

  void track();

  return {
    ready: readonly(ready),
    expire,
    settle,
  };
}
