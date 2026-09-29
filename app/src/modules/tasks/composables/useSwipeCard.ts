import { computed, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import {
  useSwipeToDismiss,
  SWIPE_SETTLE_MS,
  SWIPE_SETTLE_EASING,
} from '@/modules/tasks/composables/useSwipeToDismiss';

/** What a swipe button does. A full swipe runs the main one, shown across the whole strip past the commit point. */
export type SwipeAction =
  | 'archive'
  | 'keep'
  | 'delete'
  | 'edit'
  | 'duplicate'
  | 'pin'
  | 'unpin'
  | 'menu';

/** An icon-only `BaseButton` at its default size (`size-10`). */
export const SWIPE_BUTTON_SIZE = 40;
/** Between the buttons and around them, as with Tailwind's `gap-2`. */
export const SWIPE_BUTTON_GAP = 8;

function restWidth(buttonCount: number) {
  return buttonCount * SWIPE_BUTTON_SIZE + (buttonCount + 1) * SWIPE_BUTTON_GAP;
}

/** Settles the card and its buttons together. */
export const SWIPE_SETTLE_TIMING = `${SWIPE_SETTLE_MS}ms ${SWIPE_SETTLE_EASING}`;

const FOCUS_TIMING = 'var(--duration-focus) var(--ease-focus)';

const COLLAPSE_EASING = 'cubic-bezier(0.78, 0, 0.22, 1)';
const COLLAPSE_MS = 300;

export interface SwipeCardOptions {
  enabled: MaybeRefOrGetter<boolean>;
  /** Whether the right-hand buttons come in a pair. */
  hasSecondaryAction: MaybeRefOrGetter<boolean>;
  /** Whether swiping right reveals a single action. */
  hasStartAction: MaybeRefOrGetter<boolean>;
  /** Runs when a swipe to the right goes all the way, with the card sliding back. */
  onStartCommit: () => void;
  confirmDismiss?: () => Promise<boolean>;
  /** Runs once the card has slid out and the gap it left has closed. */
  onDismissed: () => void;
}

/**
 * A card that slides aside onto action buttons behind it, on either side. The card moves by
 * `cardStyle`; a full swipe slides it out, then closes the gap in the list
 * before `onDismissed`, so the cards below move up instead of jumping.
 */
export function useSwipeCard(
  container: Ref<HTMLElement | null>,
  card: Ref<HTMLElement | null>,
  tray: Readonly<Ref<HTMLElement | null>>,
  options: SwipeCardOptions,
) {
  function collapseContainer() {
    const el = container.value;
    if (!el) {
      options.onDismissed();
      return;
    }

    el.style.height = `${el.offsetHeight}px`;
    el.style.overflow = 'hidden';
    el.style.marginBottom = '0';
    void el.offsetHeight;

    el.style.transition = `height ${COLLAPSE_MS}ms ${COLLAPSE_EASING}, margin ${COLLAPSE_MS}ms ${COLLAPSE_EASING}`;
    el.style.height = '0';

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      el.removeEventListener('transitionend', onEnd);
      clearTimeout(fallback);
      options.onDismissed();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'height') finish();
    };
    el.addEventListener('transitionend', onEnd);
    const fallback = setTimeout(finish, COLLAPSE_MS + 50);
  }

  const swipe = useSwipeToDismiss(card, {
    enabled: options.enabled,
    revealWidth: () => restWidth(toValue(options.hasSecondaryAction) ? 2 : 1),
    startRevealWidth: () =>
      toValue(options.hasStartAction) ? restWidth(1) : 0,
    actions: tray,
    confirmDismiss: options.confirmDismiss,
    onSlideOut: collapseContainer,
    onStartCommit: options.onStartCommit,
  });

  const cardStyle = computed(() => {
    if (!swipe.isActionsVisible.value) return undefined;
    return {
      transform: `translateX(${-swipe.swipeOffset.value}px)`,
      // The corners round off on the settle clock even mid-drag, when the
      // transform itself has to follow the finger without easing. An inline
      // `transition` replaces the card's class-based one, so the focus and
      // hover properties are repeated here.
      transition: `transform ${swipe.isSwiping.value ? '0s' : SWIPE_SETTLE_TIMING}, border-radius ${SWIPE_SETTLE_TIMING}, box-shadow ${SWIPE_SETTLE_TIMING}, outline-color ${FOCUS_TIMING}, background-color ${FOCUS_TIMING}`,
    };
  });

  /** Cards flush with the screen edge round their corners once pulled aside. */
  const isRevealed = computed(
    () => swipe.swipeOffset.value !== 0 || swipe.isSwiping.value,
  );

  /** How far the card is pulled aside, whichever way. */
  const revealedOffset = computed(() => Math.abs(swipe.swipeOffset.value));

  /** Past the commit point the main action takes over the whole strip. */
  const isTakingOver = computed(() =>
    swipe.activeSide.value === 'right'
      ? swipe.isArmed.value || swipe.isDismissing.value
      : swipe.isStartArmed.value,
  );

  return { ...swipe, cardStyle, isRevealed, isTakingOver, revealedOffset };
}
