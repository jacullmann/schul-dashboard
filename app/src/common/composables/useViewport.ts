import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useEventListener, useWindowSize } from '@vueuse/core';

/** Matches the Tailwind `md` breakpoint; the app treats anything narrower as mobile. */
export const MOBILE_BREAKPOINT = 768;

export function useIsMobileViewport(): ComputedRef<boolean> {
  const { width } = useWindowSize();
  return computed(() => width.value < MOBILE_BREAKPOINT);
}

/**
 * Height of the visible area in px, shrinking while the on-screen keyboard is open.
 *
 * `100dvh` does not account for the keyboard (iOS Safari and Android Chrome by default
 * only resize the visual viewport), so full-height layouts with an input at the bottom
 * end up behind the keyboard. Returns `null` when the Visual Viewport API is unavailable.
 */
export function useVisualViewportHeight(): Ref<number | null> {
  const height = ref<number | null>(null);
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (!vv) return height;

  const update = () => {
    // Pinch-zoom also shrinks the visual viewport; the layout should not follow it.
    if (vv.scale > 1.01) return;
    height.value = Math.round(vv.height);
    // Browsers pan the page to reveal the focused input. The layout already fits the
    // visible area, so that offset would only push the header out of view.
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  };

  useEventListener(vv, 'resize', update, { passive: true });
  useEventListener(vv, 'scroll', update, { passive: true });
  update();

  return height;
}
