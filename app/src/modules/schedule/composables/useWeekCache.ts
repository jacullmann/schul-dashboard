import { computed, type ComputedRef } from 'vue';

/**
 * Builds what a week shows the first time it is asked for and keeps it, so a
 * week is only built again once something it was built from changes, not
 * whenever another week comes into view.
 */
export function useWeekCache<T>(build: (week: number) => T) {
  const weeks = new Map<number, ComputedRef<T>>();
  return (week: number): T => {
    let cached = weeks.get(week);
    if (!cached) {
      cached = computed(() => build(week));
      weeks.set(week, cached);
    }
    return cached.value;
  };
}
