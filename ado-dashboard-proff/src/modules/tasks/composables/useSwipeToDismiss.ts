import { ref, watch, type Ref } from 'vue';
import { usePointerSwipe } from '@vueuse/core';

export interface SwipeToDismissOptions {
    /** Fraction of element width needed to trigger dismiss (0–1). Default: 0.35 */
    threshold?: number;
    /** Called once the dismiss animation finishes */
    onDismiss: () => void;
}

export function useSwipeToDismiss(
    target: Ref<HTMLElement | null>,
    options: SwipeToDismissOptions,
) {
    const threshold = options.threshold ?? 0.35;

    const swipeOffset = ref(0);
    const isSwiping = ref(false);
    const isDismissing = ref(false);

    // Whether this gesture was determined to be horizontal (vs vertical scroll)
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

            // usePointerSwipe reports distance as positive when swiping left,
            // negative when swiping right. We want positive = right swipe.
            const dx = -distanceX.value;
            const dy = Math.abs(distanceY.value);

            // Decide gesture direction on first significant movement
            if (!gestureDecided && (Math.abs(dx) > 4 || dy > 4)) {
                gestureDecided = true;
                gestureLockedHorizontal = Math.abs(dx) > dy * 1.2;
            }

            if (!gestureLockedHorizontal) {
                swipeOffset.value = 0;
                return;
            }

            // Only allow right swipe (positive), clamp left to 0
            swipeOffset.value = Math.max(0, dx);
        },
        onSwipeEnd() {
            if (isDismissing.value) return;
            isSwiping.value = false;

            const offset = swipeOffset.value;
            const didPassThreshold = offset > elementWidth * threshold;

            if (didPassThreshold && gestureLockedHorizontal) {
                // Animate off-screen then dismiss
                isDismissing.value = true;
                swipeOffset.value = elementWidth + 20;

                // Wait for the slide-out transition to finish
                const onEnd = () => {
                    target.value?.removeEventListener('transitionend', onEnd);
                    options.onDismiss();
                };
                // Fallback timeout in case transitionend doesn't fire
                const fallback = setTimeout(() => {
                    target.value?.removeEventListener('transitionend', onEnd);
                    options.onDismiss();
                }, 400);

                target.value?.addEventListener('transitionend', function handler(e) {
                    if (e.propertyName === 'transform') {
                        clearTimeout(fallback);
                        target.value?.removeEventListener('transitionend', handler);
                        options.onDismiss();
                    }
                });
            } else {
                // Spring back
                swipeOffset.value = 0;
            }
        },
    });

    // Reset state when element changes (e.g. list re-renders)
    watch(target, () => {
        swipeOffset.value = 0;
        isSwiping.value = false;
        isDismissing.value = false;
    });

    return {
        swipeOffset,
        isSwiping,
        isDismissing,
    };
}
