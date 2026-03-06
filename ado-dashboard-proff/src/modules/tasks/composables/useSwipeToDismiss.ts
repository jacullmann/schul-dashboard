import { ref, watch, type Ref } from 'vue';
import { usePointerSwipe } from '@vueuse/core';

export interface SwipeToDismissOptions {
    /** Fraction of element width needed to trigger dismiss (0–1). Default: 0.35 */
    threshold?: number;
    /** Called after the card slides off-screen and the height collapse should begin */
    onSlideOut: () => void;
}

export function useSwipeToDismiss(
    target: Ref<HTMLElement | null>,
    options: SwipeToDismissOptions,
) {
    const threshold = options.threshold ?? 0.35;

    const swipeOffset = ref(0);
    // true while finger is dragging horizontally
    const isSwiping = ref(false);
    // true while the card is flying off to the right
    const isDismissing = ref(false);

    let gestureLockedHorizontal = false;
    let gestureDecided = false;
    let elementWidth = 0;

    const { distanceX, distanceY } = usePointerSwipe(target, {
        threshold: 0,
        onSwipeStart() {
            if (isDismissing.value) return;
            gestureLockedHorizontal = false;
            gestureDecided = false;
            elementWidth = target.value?.offsetWidth ?? 300;
            isSwiping.value = true;
        },
        onSwipe() {
            if (isDismissing.value) return;

            // usePointerSwipe: distanceX is positive when swiping LEFT.
            // We want positive = right swipe.
            const dx = -distanceX.value;
            const dy = Math.abs(distanceY.value);

            if (!gestureDecided && (Math.abs(dx) > 5 || dy > 5)) {
                gestureDecided = true;
                gestureLockedHorizontal = Math.abs(dx) > dy * 1.3;
            }

            if (!gestureLockedHorizontal) {
                swipeOffset.value = 0;
                return;
            }

            // Only right swipe
            swipeOffset.value = Math.max(0, dx);
        },
        onSwipeEnd() {
            if (isDismissing.value) return;
            isSwiping.value = false;

            const offset = swipeOffset.value;

            if (offset > elementWidth * threshold && gestureLockedHorizontal) {
                isDismissing.value = true;
                swipeOffset.value = elementWidth + 20;

                // After the slide-out CSS transition ends, trigger the height collapse
                const el = target.value;
                if (!el) { options.onSlideOut(); return; }

                const onTransitionEnd = (e: TransitionEvent) => {
                    if (e.propertyName !== 'transform') return;
                    el.removeEventListener('transitionend', onTransitionEnd);
                    options.onSlideOut();
                };
                el.addEventListener('transitionend', onTransitionEnd);

                // Fallback in case transitionend doesn't fire
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
