import { ref, computed, watch, type Ref } from 'vue';
import {
  usePointerSwipe,
  useElementBounding,
  useEventListener,
} from '@vueuse/core';

export interface SwipeToDismissOptions {
  enabled?: boolean;
  /** How far the card rests aside while its action button is shown. */
  revealWidth?: number;
  /** Share of the card's width past which letting go runs the action. */
  commitRatio?: number;
  /** Pressing it must not count as a press outside that closes the card. */
  actionButton?: Ref<HTMLElement | null>;
  onSlideOut: () => void;
}

const DEFAULT_REVEAL_WIDTH = 80;
const DEFAULT_COMMIT_RATIO = 0.5;
const POINTER_SWIPE_THRESHOLD = 10;
const HORIZONTAL_LOCK_RATIO = 1.2;
const SLIDE_OUT_OVERSHOOT = 20;
const SLIDE_OUT_FALLBACK_MS = 280;
const ARMED_VIBRATION_MS = 10;

function vibrate(duration: number) {
  try {
    window.navigator.vibrate?.(duration);
  } catch {
    // Not allowed or not supported by the browser/device.
  }
}

/**
 * Swiping the card right to left reveals an action button behind it. Letting
 * go past half the button snaps the card open onto it; swiping on past
 * `commitRatio` of the card's width runs the action without the tap.
 */
export function useSwipeToDismiss(
  target: Ref<HTMLElement | null>,
  options: SwipeToDismissOptions,
) {
  const enabled = options.enabled ?? true;
  const revealWidth = options.revealWidth ?? DEFAULT_REVEAL_WIDTH;
  const commitRatio = options.commitRatio ?? DEFAULT_COMMIT_RATIO;
  const gestureTarget = computed(() => (enabled ? target.value : null));

  const swipeOffset = ref(0);
  const isSwiping = ref(false);
  const isOpen = ref(false);
  const isDismissing = ref(false);

  const { width: elementWidth } = useElementBounding(gestureTarget);
  const commitOffset = computed(() =>
    Math.max(elementWidth.value * commitRatio, revealWidth * 2),
  );
  const isArmed = computed(() => swipeOffset.value >= commitOffset.value);

  let gestureDecided = false;
  let gestureLockedHorizontal = false;
  let offsetAtGestureStart = 0;
  let swallowNextClick = false;

  watch(isArmed, (armed) => {
    if (armed && isSwiping.value) vibrate(ARMED_VIBRATION_MS);
  });

  function open() {
    isOpen.value = true;
    swipeOffset.value = revealWidth;
  }

  function close() {
    isOpen.value = false;
    swipeOffset.value = 0;
  }

  function dismiss() {
    if (isDismissing.value) return;
    isDismissing.value = true;
    isOpen.value = false;
    isSwiping.value = false;
    swipeOffset.value = elementWidth.value + SLIDE_OUT_OVERSHOOT;

    const el = target.value;
    if (!el) {
      options.onSlideOut();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      el.removeEventListener('transitionend', onTransitionEnd);
      clearTimeout(fallback);
      options.onSlideOut();
    };
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'transform') finish();
    };
    el.addEventListener('transitionend', onTransitionEnd);
    const fallback = setTimeout(finish, SLIDE_OUT_FALLBACK_MS);
  }

  function settle() {
    if (isDismissing.value) return;
    isSwiping.value = false;

    if (!gestureLockedHorizontal) close();
    else if (isArmed.value) dismiss();
    else if (swipeOffset.value >= revealWidth / 2) open();
    else close();
  }

  const { distanceX, distanceY } = usePointerSwipe(gestureTarget, {
    threshold: POINTER_SWIPE_THRESHOLD,
    onSwipeStart() {
      if (isDismissing.value) return;
      gestureDecided = false;
      gestureLockedHorizontal = false;
      offsetAtGestureStart = swipeOffset.value;
      swallowNextClick = isOpen.value;
    },
    onSwipe() {
      if (isDismissing.value) return;

      // Positive when the pointer has moved to the left.
      const dx = distanceX.value;
      const dy = Math.abs(distanceY.value);

      if (!gestureDecided) {
        gestureDecided = true;
        gestureLockedHorizontal = Math.abs(dx) > dy * HORIZONTAL_LOCK_RATIO;
        isSwiping.value = gestureLockedHorizontal;
        if (gestureLockedHorizontal) swallowNextClick = true;
      }

      if (!gestureLockedHorizontal) {
        close();
        return;
      }

      swipeOffset.value = Math.max(0, offsetAtGestureStart + dx);
    },
    onSwipeEnd: settle,
  });

  // The browser cancels the pointer once it takes a vertical drag over for
  // scrolling, so no swipe end ever arrives.
  useEventListener(gestureTarget, 'pointercancel', settle, { passive: true });

  // A tap on an open card only closes it, and the click that ends a mouse
  // drag must not reach the card's controls.
  useEventListener(
    gestureTarget,
    'click',
    (e: MouseEvent) => {
      if (!swallowNextClick) return;
      swallowNextClick = false;
      e.preventDefault();
      e.stopPropagation();
      if (!gestureLockedHorizontal) close();
    },
    { capture: true },
  );

  useEventListener(
    () => (isOpen.value ? document : null),
    'pointerdown',
    (e: PointerEvent) => {
      const pressed = e.target as Node;
      if (target.value?.contains(pressed)) return;
      if (options.actionButton?.value?.contains(pressed)) return;
      close();
    },
    { capture: true, passive: true },
  );

  watch(target, () => {
    swipeOffset.value = 0;
    isSwiping.value = false;
    isOpen.value = false;
    isDismissing.value = false;
  });

  return { swipeOffset, isSwiping, isArmed, isDismissing, dismiss };
}
