import { nextTick, shallowRef, watch, type Directive, type Ref } from 'vue';

/** The keyframes of the animate-enter utility. */
const ENTRANCE_ANIMATIONS = new Set(['enter-focus', 'enter-rise']);

function entranceAnimationsOf(el: Element, subtree = false) {
  return el
    .getAnimations({ subtree })
    .filter(
      (animation): animation is CSSAnimation =>
        animation instanceof CSSAnimation &&
        ENTRANCE_ANIMATIONS.has(animation.animationName),
    );
}

function isWaitingForTurn(animation: Animation) {
  const timing = animation.effect?.getComputedTiming();
  if (!timing) return false;
  return Number(timing.localTime ?? 0) < Number(timing.delay ?? 0);
}

/**
 * When the skeleton shown while `held` began its entrance, kept until the
 * content replacing it has mounted. Anchoring both to this time with
 * `v-entrance-start` lets the content pick up the skeleton's motion exactly
 * where it is, instead of replaying the entrance from the start.
 */
export function useSkeletonHandoff(held: Readonly<Ref<boolean>>) {
  const entranceStart = shallowRef<number | null>(null);

  watch(
    held,
    (isHeld) => {
      if (isHeld) {
        // The document timeline counts from the same origin as performance.now().
        entranceStart.value = performance.now();
        return;
      }
      // Only what mounts in the skeleton's place takes over its motion;
      // anything added later enters on its own.
      void nextTick(() => {
        entranceStart.value = null;
      });
    },
    { immediate: true },
  );

  return entranceStart;
}

/**
 * Starts an element's animate-enter at the given document timeline time rather
 * than when it mounts. Skeleton and content share their stagger delays, so a
 * shared start puts them in the same place at every frame.
 */
export const vEntranceStart: Directive<Element, number | null> = {
  mounted(el, { value }) {
    if (value === null) return;
    for (const animation of entranceAnimationsOf(el)) {
      animation.startTime = value;
    }
  },
};

/**
 * For a skeleton on its way out: parts still waiting for their turn stay
 * hidden instead of appearing only to fade, while those already moving keep
 * in step with the content taking their place.
 */
export function holdPendingEntrances(el: Element) {
  for (const animation of entranceAnimationsOf(el, true)) {
    if (isWaitingForTurn(animation)) animation.pause();
  }
}
