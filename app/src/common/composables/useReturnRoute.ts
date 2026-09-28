import { toValue, type MaybeRefOrGetter } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';

/**
 * Leaves a page the way closing an overlay would: back to the page it was
 * opened from, or to `fallback` when it was opened directly.
 */
export function useReturnRoute(fallback: MaybeRefOrGetter<RouteLocationRaw>) {
  const router = useRouter();
  // Read once on setup: navigations within the page (e.g. between its tabs)
  // reuse this instance and would otherwise make the origin one of its own tabs.
  const origin = router.options.history.state.back;

  function leave() {
    void router.push(typeof origin === 'string' ? origin : toValue(fallback));
  }

  return { leave };
}
