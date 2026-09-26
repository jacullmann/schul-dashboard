import { computed, readonly, ref, type ComputedRef, type Ref } from 'vue';
import {
  createSharedComposable,
  useEventListener,
  useWindowSize,
} from '@vueuse/core';

/** Matches the Tailwind `md` breakpoint; the app treats anything narrower as mobile. */
export const MOBILE_BREAKPOINT = 768;

/**
 * How much shorter than the layout viewport the visual viewport has to be for
 * the difference to be an on-screen keyboard: taller than any browser toolbar
 * sliding in, shorter than any phone keyboard.
 */
const KEYBOARD_MIN_HEIGHT = 150;

/** Beyond this the visual viewport is pinch-zoomed, and shrinks for that reason alone. */
const ZOOMED_SCALE = 1.01;

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
    if (vv.scale > ZOOMED_SCALE) return;
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

/**
 * Whether an on-screen keyboard covers the bottom of the page. The keyboard
 * only shrinks the visual viewport, so fixed content anchored to the bottom
 * would sit behind it. Always false where the Visual Viewport API is missing.
 */
export const useIsOnScreenKeyboardOpen = createSharedComposable(
  (): Readonly<Ref<boolean>> => {
    const isOpen = ref(false);
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return readonly(isOpen);

    const update = () => {
      if (vv.scale > ZOOMED_SCALE) return;
      // The root's client height is the layout viewport, which the keyboard leaves alone.
      isOpen.value =
        document.documentElement.clientHeight - vv.height > KEYBOARD_MIN_HEIGHT;
    };

    useEventListener(vv, 'resize', update, { passive: true });
    update();

    return readonly(isOpen);
  },
);
