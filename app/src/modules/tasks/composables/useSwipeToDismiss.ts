import {
  ref,
  computed,
  watch,
  toValue,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import {
  usePointerSwipe,
  useElementBounding,
  useEventListener,
  useTimeoutFn,
} from '@vueuse/core';
import { haptic } from '@/utils/haptics';

export interface SwipeToDismissOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  /** How far the card rests aside, to the left, while its action buttons are shown. */
  revealWidth?: MaybeRefOrGetter<number>;
  /** The same for a swipe to the right; 0 leaves the card unable to go that way. */
  startRevealWidth?: MaybeRefOrGetter<number>;
  /** Share of the card's width past which letting go runs the action. */
  commitRatio?: number;
  /** Pressing inside must not count as a press outside that closes the card. */
  actions?: Readonly<Ref<HTMLElement | null>>;
  /** Asked before the card slides out; declining puts the card back. */
  confirmDismiss?: () => Promise<boolean>;
  onSlideOut: () => void;
  /** Runs when a swipe to the right goes all the way; the card then settles back. */
  onStartCommit?: () => void;
}

/** The edge of the card its action buttons appear at. */
export type SwipeSide = 'left' | 'right';

/** Shared with the card, whose transform has to land together with the buttons. */
export const SWIPE_SETTLE_MS = 380;
export const SWIPE_SETTLE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const DEFAULT_REVEAL_WIDTH = 80;
const DEFAULT_COMMIT_RATIO = 0.6;
/** Keeps the full swipe clear of the resting point on narrow cards. */
const MIN_COMMIT_TRAVEL = 64;
const POINTER_SWIPE_THRESHOLD = 10;
const HORIZONTAL_LOCK_RATIO = 1.2;
const SLIDE_OUT_OVERSHOOT = 20;
const SLIDE_OUT_FALLBACK_MS = 280;
const ARMED_VIBRATION_MS = 10;
/** px/ms: a flick this fast opens or closes the card wherever it is let go. */
const FLICK_VELOCITY = 0.35;
/** Only the last stretch of the drag tells where the finger was heading. */
const VELOCITY_WINDOW_MS = 80;

/**
 * Touch only: a mouse has the card's menu for the same actions, and dragging
 * with it would fight text selection. Swiping the card right to left reveals
 * its action buttons behind it, left to right the ones on the other side.
 * Letting go past half of them, or flicking towards them, snaps the card open
 * onto them; swiping on past `commitRatio` of the card's width runs the main
 * action without the tap. `swipeOffset` is positive while the card is pulled
 * left and negative while it is pulled right.
 */
export function useSwipeToDismiss(
  target: Ref<HTMLElement | null>,
  options: SwipeToDismissOptions,
) {
  const revealWidth = computed(() =>
    toValue(options.revealWidth ?? DEFAULT_REVEAL_WIDTH),
  );
  const startRevealWidth = computed(() =>
    toValue(options.startRevealWidth ?? 0),
  );
  const hasStartSide = computed(() => startRevealWidth.value > 0);
  const commitRatio = options.commitRatio ?? DEFAULT_COMMIT_RATIO;
  const gestureTarget = computed(() =>
    toValue(options.enabled ?? true) ? target.value : null,
  );

  const swipeOffset = ref(0);
  const isSwiping = ref(false);
  const openSide = ref<SwipeSide | null>(null);
  /** Outlasts the offset's return to 0, so the buttons stay on their side while the card slides back. */
  const activeSide = ref<SwipeSide>('right');
  const isDismissing = ref(false);
  /** Outlasts the offset's return to 0 until the card has slid back. */
  const isActionsVisible = ref(false);

  const { width: elementWidth } = useElementBounding(gestureTarget);
  const commitOffsetBeyond = (reveal: number) =>
    Math.max(elementWidth.value * commitRatio, reveal + MIN_COMMIT_TRAVEL);
  const isArmed = computed(
    () => swipeOffset.value >= commitOffsetBeyond(revealWidth.value),
  );
  const isStartArmed = computed(
    () =>
      hasStartSide.value &&
      -swipeOffset.value >= commitOffsetBeyond(startRevealWidth.value),
  );

  let gestureDecided = false;
  let gestureLockedHorizontal = false;
  let offsetAtGestureStart = 0;
  let swallowNextClick = false;
  let velocitySamples: { time: number; offset: number }[] = [];

  const { start: hideActionsAfterSettle, stop: keepActionsVisible } =
    useTimeoutFn(
      () => {
        isActionsVisible.value = false;
      },
      SWIPE_SETTLE_MS,
      { immediate: false },
    );

  watch([swipeOffset, isSwiping], ([offset, swiping]) => {
    if (offset !== 0) activeSide.value = offset > 0 ? 'right' : 'left';
    if (offset !== 0 || swiping) {
      keepActionsVisible();
      isActionsVisible.value = true;
    } else if (isActionsVisible.value) {
      hideActionsAfterSettle();
    }
  });

  watch([isArmed, isStartArmed], () => {
    if (isSwiping.value) haptic(ARMED_VIBRATION_MS);
  });

  function open(side: SwipeSide) {
    openSide.value = side;
    swipeOffset.value =
      side === 'right' ? revealWidth.value : -startRevealWidth.value;
  }

  function close() {
    openSide.value = null;
    swipeOffset.value = 0;
  }

  async function dismiss() {
    if (isDismissing.value) return;
    isDismissing.value = true;
    openSide.value = null;
    isSwiping.value = false;

    if (options.confirmDismiss) {
      // Rests on the action buttons while the question is open. Not `open()`:
      // a press inside the dialog would count as a press outside the card.
      swipeOffset.value = revealWidth.value;
      const confirmed = await options.confirmDismiss();
      if (!confirmed) {
        isDismissing.value = false;
        close();
        return;
      }
    }

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

  /** Positive while the card is heading left. */
  function releaseVelocity() {
    const first = velocitySamples[0];
    const last = velocitySamples.at(-1);
    if (!first || !last || last.time === first.time) return 0;
    // A finger that came to rest before lifting has no momentum left.
    if (performance.now() - last.time > VELOCITY_WINDOW_MS) return 0;
    return (last.offset - first.offset) / (last.time - first.time);
  }

  function settle() {
    if (isDismissing.value) return;
    isSwiping.value = false;
    const velocity = releaseVelocity();
    velocitySamples = [];

    if (!gestureLockedHorizontal) close();
    else if (isArmed.value) void dismiss();
    else if (isStartArmed.value) {
      close();
      options.onStartCommit?.();
    } else settleTowardsSide(velocity);
  }

  function settleTowardsSide(velocity: number) {
    const side: SwipeSide = swipeOffset.value >= 0 ? 'right' : 'left';
    const reveal =
      side === 'right' ? revealWidth.value : startRevealWidth.value;
    const towardsButtons = side === 'right' ? velocity : -velocity;

    if (towardsButtons >= FLICK_VELOCITY) open(side);
    else if (towardsButtons <= -FLICK_VELOCITY) close();
    else if (Math.abs(swipeOffset.value) >= reveal / 2) open(side);
    else close();
  }

  const { distanceX, distanceY } = usePointerSwipe(gestureTarget, {
    threshold: POINTER_SWIPE_THRESHOLD,
    pointerTypes: ['touch'],
    onSwipeStart() {
      if (isDismissing.value) return;
      gestureDecided = false;
      gestureLockedHorizontal = false;
      offsetAtGestureStart = swipeOffset.value;
      swallowNextClick = openSide.value !== null;
      velocitySamples = [];
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

      const minOffset = hasStartSide.value ? -Infinity : 0;
      swipeOffset.value = Math.max(minOffset, offsetAtGestureStart + dx);

      const now = performance.now();
      velocitySamples.push({ time: now, offset: swipeOffset.value });
      velocitySamples = velocitySamples.filter(
        (sample) => now - sample.time <= VELOCITY_WINDOW_MS,
      );
    },
    onSwipeEnd: settle,
  });

  // The browser cancels the pointer once it takes a vertical drag over for
  // scrolling, so no swipe end ever arrives.
  useEventListener(gestureTarget, 'pointercancel', settle, { passive: true });

  // `touch-action: pan-y` alone still lets some mobile browsers scroll the
  // page along with the finger's vertical drift during a horizontal swipe.
  useEventListener(
    gestureTarget,
    'touchmove',
    (e: TouchEvent) => {
      if (isSwiping.value && e.cancelable) e.preventDefault();
    },
    { passive: false },
  );

  // A tap on an open card only closes it, and the click that ends a swipe
  // must not reach the card's controls.
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
    () => (openSide.value ? document : null),
    'pointerdown',
    (e: PointerEvent) => {
      const pressed = e.target as Node;
      if (target.value?.contains(pressed)) return;
      if (options.actions?.value?.contains(pressed)) return;
      close();
    },
    { capture: true, passive: true },
  );

  watch(target, () => {
    swipeOffset.value = 0;
    isSwiping.value = false;
    openSide.value = null;
    isDismissing.value = false;
    isActionsVisible.value = false;
  });

  return {
    swipeOffset,
    isSwiping,
    isArmed,
    isStartArmed,
    activeSide,
    isDismissing,
    isActionsVisible,
    dismiss,
    close,
  };
}
