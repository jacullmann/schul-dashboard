import { computed, nextTick, ref, shallowRef, watch } from 'vue';
import { useEventListener, usePreferredReducedMotion } from '@vueuse/core';
import {
  EDGE_RESISTANCE,
  FLICK_VELOCITY,
  lockAxis,
  PAGE_COMMIT_FRACTION,
  VelocityTracker,
} from '@/utils/gesture';

/**
 * Space between the day on screen and the one sliding in, in px: the page's
 * 16px gutter on both sides, so each day slides as if it carried its padding.
 */
const DAY_PAGE_GAP = 32;

type Direction = 1 | -1;

export type ScheduleDayPager = ReturnType<typeof useScheduleDayPager>;

export function useScheduleDayPager(dayCount: number) {
  const trackRef = shallowRef<HTMLElement | null>(null);
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
  const tracker = new VelocityTracker();

  useEventListener(
    trackRef,
    'touchstart',
    (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || event.touches.length > 1) return;
      if (settling.value) finishSettling();
      startX = touch.clientX;
      startY = touch.clientY;
      tracker.reset();
      tracker.record(event.timeStamp, touch.clientX);
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
        axis = lockAxis(dx, dy);
        if (axis !== 'x') return;
      }

      event.preventDefault();
      tracker.record(event.timeStamp, touch.clientX);

      const neighbour = activeDayIndex.value - Math.sign(dx);
      const hasNeighbour = dx !== 0 && neighbour >= 0 && neighbour < dayCount;
      incomingDayIndex.value = hasNeighbour ? neighbour : null;
      offset.value = hasNeighbour ? dx : dx * EDGE_RESISTANCE;
    },
    { passive: false },
  );

  const endSwipe = (event: TouchEvent, cancelled: boolean) => {
    if (axis !== 'x') return;
    axis = null;

    const velocity = tracker.velocity(event.timeStamp);
    const flicked =
      Math.abs(velocity) > FLICK_VELOCITY &&
      Math.sign(velocity) === Math.sign(offset.value);
    const farEnough =
      Math.abs(offset.value) > pageWidth() * PAGE_COMMIT_FRACTION;

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

  useEventListener(trackRef, 'touchend', (e) => endSwipe(e, false), {
    passive: true,
  });
  useEventListener(trackRef, 'touchcancel', (e) => endSwipe(e, true), {
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
    trackRef,
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
