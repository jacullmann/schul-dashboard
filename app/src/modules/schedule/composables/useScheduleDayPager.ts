import { computed, nextTick, ref, watch, type Ref } from 'vue';
import { useEventListener, usePreferredReducedMotion } from '@vueuse/core';

/** Space between the day on screen and the one sliding in, in px. */
const DAY_PAGE_GAP = 16;
/** How far a touch travels before it is read as a swipe or a scroll, in px. */
const SWIPE_SLOP = 8;
/** The share of the width a swipe must cover to turn the page on release. */
const COMMIT_FRACTION = 0.3;
/** A release faster than this turns the page however short the swipe, in px/ms. */
const FLICK_VELOCITY = 0.3;
/** How much of a swipe past the first or last day the page follows. */
const EDGE_RESISTANCE = 0.3;

type Direction = 1 | -1;

export function useScheduleDayPager(
  trackRef: Ref<HTMLElement | null>,
  dayCount: number,
) {
  const reducedMotion = usePreferredReducedMotion();

  const activeDayIndex = ref(0);
  const selectedDayIndex = ref(0);
  const incomingDayIndex = ref<number | null>(null);
  const offset = ref(0);
  const settling = ref(false);
  const hasPaged = ref(false);

  watch(incomingDayIndex, (index) => {
    if (index !== null) hasPaged.value = true;
  });

  let onSettled: (() => void) | null = null;

  const direction = computed<Direction>(() =>
    incomingDayIndex.value !== null &&
    incomingDayIndex.value < activeDayIndex.value
      ? -1
      : 1,
  );

  const pageWidth = () => (trackRef.value?.clientWidth ?? 0) + DAY_PAGE_GAP;

  const finishSettling = () => {
    settling.value = false;
    const done = onSettled;
    onSettled = null;
    done?.();
  };

  const settleTo = (target: number, done: () => void) => {
    if (reducedMotion.value === 'reduce' || offset.value === target) {
      offset.value = target;
      done();
      return;
    }
    onSettled = done;
    settling.value = true;
    offset.value = target;
  };

  const commitIncoming = () => {
    if (incomingDayIndex.value !== null) {
      activeDayIndex.value = incomingDayIndex.value;
    }
    incomingDayIndex.value = null;
    offset.value = 0;
  };

  const turnPage = () => {
    selectedDayIndex.value = incomingDayIndex.value ?? activeDayIndex.value;
    settleTo(-direction.value * pageWidth(), commitIncoming);
  };

  const cancelPage = () => {
    settleTo(0, () => {
      incomingDayIndex.value = null;
    });
  };

  const showDay = (index: number) => {
    if (settling.value) finishSettling();
    incomingDayIndex.value = null;
    offset.value = 0;
    activeDayIndex.value = index;
    selectedDayIndex.value = index;
  };

  const goToDay = async (index: number) => {
    if (settling.value) finishSettling();
    if (index === activeDayIndex.value) return;
    if (reducedMotion.value === 'reduce') {
      showDay(index);
      return;
    }

    incomingDayIndex.value = index;
    selectedDayIndex.value = index;
    await nextTick();
    // Lays the incoming day out beside this one before the slide starts.
    void trackRef.value?.offsetWidth;
    turnPage();
  };

  const onPanelTransitionEnd = (event: TransitionEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== 'transform' || !settling.value) return;
    finishSettling();
  };

  let startX = 0;
  let startY = 0;
  let axis: 'x' | 'y' | null = null;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;

  useEventListener(
    trackRef,
    'touchstart',
    (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || event.touches.length > 1) return;
      if (settling.value) finishSettling();
      startX = lastX = touch.clientX;
      startY = touch.clientY;
      lastTime = event.timeStamp;
      velocity = 0;
      axis = null;
    },
    { passive: true },
  );

  useEventListener(
    trackRef,
    'touchmove',
    (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || axis === 'y') return;

      const dx = touch.clientX - startX;
      if (axis === null) {
        const dy = touch.clientY - startY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_SLOP) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis === 'y') return;
      }

      event.preventDefault();
      const elapsed = event.timeStamp - lastTime;
      if (elapsed > 0) velocity = (touch.clientX - lastX) / elapsed;
      lastX = touch.clientX;
      lastTime = event.timeStamp;

      const neighbour = activeDayIndex.value - Math.sign(dx);
      const hasNeighbour = dx !== 0 && neighbour >= 0 && neighbour < dayCount;
      incomingDayIndex.value = hasNeighbour ? neighbour : null;
      offset.value = hasNeighbour ? dx : dx * EDGE_RESISTANCE;
    },
    { passive: false },
  );

  const endSwipe = (cancelled: boolean) => {
    if (axis !== 'x') return;
    axis = null;

    const flicked =
      Math.abs(velocity) > FLICK_VELOCITY &&
      Math.sign(velocity) === Math.sign(offset.value);
    const farEnough = Math.abs(offset.value) > pageWidth() * COMMIT_FRACTION;

    if (
      !cancelled &&
      incomingDayIndex.value !== null &&
      (flicked || farEnough)
    ) {
      turnPage();
    } else {
      cancelPage();
    }
  };

  useEventListener(trackRef, 'touchend', () => endSwipe(false), {
    passive: true,
  });
  useEventListener(trackRef, 'touchcancel', () => endSwipe(true), {
    passive: true,
  });

  const panelStyle = (dayIndex: number) => {
    const shift =
      dayIndex === activeDayIndex.value
        ? `${offset.value}px`
        : `calc(${offset.value}px + ${direction.value * 100}% + ${direction.value * DAY_PAGE_GAP}px)`;
    return { transform: `translateX(${shift})` };
  };

  return {
    activeDayIndex,
    selectedDayIndex,
    incomingDayIndex,
    settling,
    hasPaged,
    goToDay,
    showDay,
    panelStyle,
    onPanelTransitionEnd,
  };
}
