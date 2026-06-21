import { ref, watch, type Ref } from 'vue';
import { usePointerSwipe, useElementBounding } from '@vueuse/core';

export interface SwipeToDismissOptions {
  threshold?: number;
  onSlideOut: () => void;
}

export function useSwipeToDismiss(
  target: Ref<HTMLElement | null>,
  options: SwipeToDismissOptions,
) {
  const threshold = options.threshold ?? 0.35;

  const swipeOffset = ref(0);
  const isSwiping = ref(false);
  const isDismissing = ref(false);

  let gestureLockedHorizontal = false;
  let gestureDecided = false;
  let hasVibrated = false;

  const { width: elementWidth } = useElementBounding(target);

  const { distanceX, distanceY } = usePointerSwipe(target, {
    threshold: 10,
    onSwipeStart() {
      if (isDismissing.value) return;
      gestureLockedHorizontal = false;
      gestureDecided = false;
      isSwiping.value = false;
      hasVibrated = false;
    },
    onSwipe() {
      if (isDismissing.value) return;

      const dx = -distanceX.value;
      const dy = Math.abs(distanceY.value);

      if (!gestureDecided) {
        gestureDecided = true;
        gestureLockedHorizontal = Math.abs(dx) > dy * 1.2;
        if (gestureLockedHorizontal) {
          isSwiping.value = true;
        }
      }

      if (!gestureLockedHorizontal) {
        swipeOffset.value = 0;
        return;
      }

      swipeOffset.value = Math.max(0, dx);

      const thresholdPx = elementWidth.value * threshold;
      if (swipeOffset.value >= thresholdPx) {
        if (!hasVibrated) {
          if (
            typeof window !== 'undefined' &&
            window.navigator &&
            window.navigator.vibrate
          ) {
            try {
              window.navigator.vibrate(10);
            } catch {
              // Ignore vibration errors (e.g. if not allowed or not supported by browser/device)
            }
          }
          hasVibrated = true;
        }
      } else {
        hasVibrated = false;
      }
    },
    onSwipeEnd() {
      if (isDismissing.value) return;
      isSwiping.value = false;

      const offset = swipeOffset.value;

      if (offset > elementWidth.value * threshold && gestureLockedHorizontal) {
        isDismissing.value = true;
        swipeOffset.value = elementWidth.value + 20;

        const el = target.value;
        if (!el) {
          options.onSlideOut();
          return;
        }

        const onTransitionEnd = (e: TransitionEvent) => {
          if (e.propertyName !== 'transform') return;
          el.removeEventListener('transitionend', onTransitionEnd);
          options.onSlideOut();
        };
        el.addEventListener('transitionend', onTransitionEnd);

        setTimeout(() => {
          el.removeEventListener('transitionend', onTransitionEnd);
          options.onSlideOut();
        }, 280);
      } else {
        swipeOffset.value = 0;
      }
    },
  });

  watch(target, () => {
    swipeOffset.value = 0;
    isSwiping.value = false;
    isDismissing.value = false;
  });

  return { swipeOffset, isSwiping, isDismissing };
}
