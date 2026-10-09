import { toValue, type MaybeRefOrGetter } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { useEventListener } from '@vueuse/core';

/**
 * Asks before the page is left while something on it would be lost: on a
 * route change (also between tabs of the same page) and on reload or close,
 * where the browser shows its own prompt.
 */
export function useLeaveGuard(
  hasUnsavedState: MaybeRefOrGetter<boolean>,
  confirmLeave: () => Promise<boolean>,
): void {
  const allowLeave = async () =>
    !toValue(hasUnsavedState) || (await confirmLeave());

  onBeforeRouteLeave(allowLeave);
  onBeforeRouteUpdate(allowLeave);

  useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
    if (toValue(hasUnsavedState)) event.preventDefault();
  });
}
