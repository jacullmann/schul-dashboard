import { computed, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import {
  useSwipeToDismiss,
  SWIPE_SETTLE_MS,
  SWIPE_SETTLE_EASING,
} from '@/modules/tasks/composables/useSwipeToDismiss';

/** The action a full swipe runs, shown across the whole strip past the commit point. */
export type SwipeAction = 'archive' | 'keep' | 'delete';
/** Shown beside the main action while the card rests open. */
export type SecondarySwipeAction = 'edit' | 'pin' | 'unpin';

/** Room each action button gets while the card rests open. */
export const SWIPE_ACTION_WIDTH = 76;

/** Settles the card and its buttons together. */
export const SWIPE_SETTLE_TIMING = `${SWIPE_SETTLE_MS}ms ${SWIPE_SETTLE_EASING}`;

const COLLAPSE_EASING = 'cubic-bezier(0.78, 0, 0.22, 1)';
const COLLAPSE_MS = 300;

export interface SwipeCardOptions {
  enabled: MaybeRefOrGetter<boolean>;
  hasSecondaryAction: MaybeRefOrGetter<boolean>;
  confirmDismiss?: () => Promise<boolean>;
  /** Runs once the card has slid out and the gap it left has closed. */
  onDismissed: () => void;
}

/**
 * A card that slides aside onto action buttons behind it. The card moves by
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
    revealWidth: () =>
      SWIPE_ACTION_WIDTH * (toValue(options.hasSecondaryAction) ? 2 : 1),
    actions: tray,
    confirmDismiss: options.confirmDismiss,
    onSlideOut: collapseContainer,
  });

  const cardStyle = computed(() => {
    if (!swipe.isActionsVisible.value) return undefined;
    return {
      transform: `translateX(${-swipe.swipeOffset.value}px)`,
      transition: swipe.isSwiping.value
        ? 'none'
        : `transform ${SWIPE_SETTLE_TIMING}`,
    };
  });

  /** Past the commit point the main action takes over the whole strip. */
  const isTakingOver = computed(
    () => swipe.isArmed.value || swipe.isDismissing.value,
  );

  return { ...swipe, cardStyle, isTakingOver };
}
