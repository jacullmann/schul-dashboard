import { toValue, type MaybeRefOrGetter } from 'vue';
import {
  useRouter,
  type RouteLocationRaw,
  type RouteRecordName,
} from 'vue-router';

/**
 * Leaves a page the way closing an overlay would: back to the page it was
 * opened from, or to `fallback` when it was opened directly or from one of
 * the `skippedOrigins` routes.
 */
export function useReturnRoute(
  fallback: MaybeRefOrGetter<RouteLocationRaw>,
  skippedOrigins: RouteRecordName[] = [],
) {
  const router = useRouter();
  // Read once on setup: navigations within the page (e.g. between its tabs)
  // reuse this instance and would otherwise make the origin one of its own tabs.
  const origin = router.options.history.state.back;
  const returnTo =
    typeof origin === 'string' &&
    !skippedOrigins.includes(router.resolve(origin).name ?? '')
      ? origin
      : undefined;

  function leave() {
    void router.push(returnTo ?? toValue(fallback));
  }

  return { leave };
}
