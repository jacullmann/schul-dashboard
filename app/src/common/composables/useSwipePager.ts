import { readonly, ref, watch, type Ref } from 'vue';
import { useEventListener, usePreferredReducedMotion } from '@vueuse/core';

export type PageStep = -1 | 1;

export interface SwipePagerOptions {
  /** Index of the page on screen; a change by one slides the neighbour in. */
  page: () => number;
  /** Asked to turn the page once a swipe commits. */
  onSwipe: (step: PageStep) => void;
}

/** The easing of the swap transitions in style.css. */
const SLIDE_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
/** Start speed of SLIDE_EASING relative to a linear slide of the same length. */
const SLIDE_EASING_START_SLOPE = 0.72 / 0.32;
const SLIDE_MS = 450;
const MIN_FLING_MS = 180;
/** How far a touch travels before it is read as a swipe or a scroll, in px. */
const SWIPE_SLOP = 6;
/** The share of the width a slow swipe must cover to turn the page. */
const COMMIT_FRACTION = 0.5;
/** A release faster than this decides the page by its direction, in px/ms. */
const FLICK_VELOCITY = 0.3;
/** Only the finger's most recent movement counts towards its release speed. */
const VELOCITY_WINDOW_MS = 100;
/** Pages rendered per side while a slide catches up with rapid page turns. */
const MAX_REACH = 2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const findTouch = (touches: TouchList, id: number) =>
  Array.from(touches).find((touch) => touch.identifier === id);

/**
 * Pages a strip of equally wide panels, the current one at offset 0 and its
 * neighbours at ±100%, rendered `reach` pages to each side. The page changes
 * at once, and the track is shifted back by a page width to keep the old
 * panel in place, then eases home. So a slide can be interrupted by the next
 * one, or caught by the finger, from wherever it is.
 *
 * The track's transform is written straight to its style rather than through
 * reactive state: following the finger must not re-render every panel.
 */
export function useSwipePager(
  track: Ref<HTMLElement | null>,
  gestureArea: Ref<HTMLElement | null>,
  options: SwipePagerOptions,
) {
  const reducedMotion = usePreferredReducedMotion();
  const reach = ref(1);

  const pageWidth = () => track.value?.offsetWidth ?? 0;

  const currentOffset = () => {
    if (!track.value) return 0;
    const { transform } = getComputedStyle(track.value);
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
  };

  const place = (offset: number) => {
    if (!track.value) return;
    track.value.style.transition = 'none';
    track.value.style.transform = `translateX(${offset}px)`;
  };

  /** `velocity` in px/ms; a slide already heading home keeps its speed. */
  const slideHome = (from: number, velocity = 0) => {
    const el = track.value;
    if (!el || from === 0 || reducedMotion.value === 'reduce') {
      place(0);
      reach.value = 1;
      return;
    }

    place(from);
    // Commits the start position so the transition runs from it.
    void el.offsetWidth;

    const speedHome = -Math.sign(from) * velocity;
    const duration =
      speedHome > 0
        ? clamp(
            (SLIDE_EASING_START_SLOPE * Math.abs(from)) / speedHome,
            MIN_FLING_MS,
            SLIDE_MS,
          )
        : SLIDE_MS;
    el.style.transition = `transform ${duration}ms ${SLIDE_EASING}`;
    el.style.transform = 'translateX(0px)';
  };

  let releaseVelocity = 0;

  const slide = (step: PageStep) => {
    const width = pageWidth();
    if (!width) return;
    const limit = MAX_REACH * width;
    const from = clamp(currentOffset() + step * width, -limit, limit);
    reach.value = Math.max(reach.value, Math.ceil(Math.abs(from) / width));
    slideHome(from, releaseVelocity);
  };

  // Sync, so the shifted track and the re-indexed panels land in one frame.
  watch(
    options.page,
    (page, previous) => {
      const step = page - previous;
      if (step === 1 || step === -1) slide(step);
      else slideHome(0);
    },
    { flush: 'sync' },
  );

  useEventListener(track, 'transitionend', (event: TransitionEvent) => {
    if (event.target === track.value && event.propertyName === 'transform') {
      reach.value = 1;
    }
  });

  let touchId: number | null = null;
  let axis: 'x' | 'y' | null = null;
  let startX = 0;
  let startY = 0;
  let dragFrom = 0;
  let swallowClick = false;
  const samples: { time: number; x: number }[] = [];

  const recordSample = (time: number, x: number) => {
    samples.push({ time, x });
    while (samples.length > 2 && time - samples[0]!.time > VELOCITY_WINDOW_MS) {
      samples.shift();
    }
  };

  const velocityAt = (time: number) => {
    const first = samples[0];
    const last = samples.at(-1);
    if (!first || !last || last.time === first.time) return 0;
    if (time - last.time > VELOCITY_WINDOW_MS) return 0;
    return (last.x - first.x) / (last.time - first.time);
  };

  const endSwipe = (event: TouchEvent, cancelled: boolean) => {
    if (touchId === null || !findTouch(event.changedTouches, touchId)) return;
    touchId = null;
    if (axis === 'y') return;
    if (axis === null) {
      slideHome(dragFrom);
      return;
    }
    axis = null;

    const offset = currentOffset();
    const velocity = velocityAt(event.timeStamp);
    const turns =
      Math.abs(velocity) > FLICK_VELOCITY
        ? Math.sign(velocity) === Math.sign(offset)
        : Math.abs(offset) > pageWidth() * COMMIT_FRACTION;

    if (!cancelled && turns && offset !== 0) {
      const before = options.page();
      releaseVelocity = velocity;
      options.onSwipe(offset > 0 ? -1 : 1);
      releaseVelocity = 0;
      if (options.page() !== before) return;
    }
    slideHome(offset, velocity);
  };

  useEventListener(
    gestureArea,
    'touchstart',
    (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      // Further fingers leave the swipe to the first one.
      if (!touch || (touchId !== null && event.touches.length > 1)) return;
      touchId = touch.identifier;
      axis = null;
      startX = touch.clientX;
      startY = touch.clientY;
      swallowClick = false;
      samples.length = 0;
      recordSample(event.timeStamp, touch.clientX);
      // Catches a running slide under the finger.
      dragFrom = currentOffset();
      if (dragFrom !== 0) place(dragFrom);
    },
    { passive: true },
  );

  useEventListener(
    gestureArea,
    'touchmove',
    (event: TouchEvent) => {
      const touch = touchId === null ? null : findTouch(event.touches, touchId);
      if (!touch || axis === 'y') return;

      const dx = touch.clientX - startX;
      if (axis === null) {
        const dy = touch.clientY - startY;
        // Held back until the axis is known, so an enclosing sheet does not
        // start dragging along with a swipe.
        event.stopPropagation();
        if (Math.hypot(dx, dy) < SWIPE_SLOP) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis === 'y') {
          slideHome(dragFrom);
          return;
        }
        swallowClick = true;
      }

      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      recordSample(event.timeStamp, touch.clientX);
      const limit = reach.value * pageWidth();
      place(clamp(dragFrom + dx, -limit, limit));
    },
    { passive: false },
  );

  useEventListener(gestureArea, 'touchend', (e) => endSwipe(e, false), {
    passive: true,
  });
  useEventListener(gestureArea, 'touchcancel', (e) => endSwipe(e, true), {
    passive: true,
  });

  // The click that ends a swipe must not pick the day under the finger.
  useEventListener(
    gestureArea,
    'click',
    (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true },
  );

  watch(track, () => {
    touchId = null;
    axis = null;
    reach.value = 1;
  });

  return { reach: readonly(reach) };
}
