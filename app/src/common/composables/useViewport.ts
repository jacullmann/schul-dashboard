import { computed, type ComputedRef } from 'vue';
import { useWindowSize } from '@vueuse/core';

/** Matches the Tailwind `md` breakpoint; the app treats anything narrower as mobile. */
export const MOBILE_BREAKPOINT = 768;

export function useIsMobileViewport(): ComputedRef<boolean> {
  const { width } = useWindowSize();
  return computed(() => width.value < MOBILE_BREAKPOINT);
}
