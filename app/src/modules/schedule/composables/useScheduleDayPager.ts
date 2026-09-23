import { ref, type Ref } from 'vue';
import { useEventListener, usePreferredReducedMotion } from '@vueuse/core';

export function useScheduleDayPager(
  containerRef: Ref<HTMLElement | null>,
  daySelector: string,
) {
  const reducedMotion = usePreferredReducedMotion();
  const activeDayIndex = ref(0);

  // A tapped day scrolls past the days between; they must not steal the pill on the way.
  let targetDayIndex: number | null = null;
  let frameRequested = false;

  const dayOffsets = (): number[] =>
    Array.from(
      containerRef.value?.querySelectorAll<HTMLElement>(daySelector) ?? [],
      (day) => day.offsetLeft,
    );

  const nearestDayIndex = (scrollLeft: number): number =>
    dayOffsets().reduce(
      (nearest, offset, index, offsets) =>
        Math.abs(offset - scrollLeft) <
        Math.abs((offsets[nearest] ?? 0) - scrollLeft)
          ? index
          : nearest,
      0,
    );

  const syncActiveDay = () => {
    frameRequested = false;
    const container = containerRef.value;
    if (!container) return;

    const index = nearestDayIndex(container.scrollLeft);
    if (targetDayIndex !== null && index !== targetDayIndex) return;
    targetDayIndex = null;
    activeDayIndex.value = index;
  };

  const scrollToDay = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.value;
    const offset = dayOffsets()[index];
    if (!container || offset === undefined) return;

    targetDayIndex = index;
    activeDayIndex.value = index;
    container.scrollTo({
      left: offset,
      behavior: reducedMotion.value === 'reduce' ? 'auto' : behavior,
    });
  };

  useEventListener(
    containerRef,
    'scroll',
    () => {
      if (frameRequested) return;
      frameRequested = true;
      requestAnimationFrame(syncActiveDay);
    },
    { passive: true },
  );

  useEventListener(
    containerRef,
    'touchstart',
    () => {
      targetDayIndex = null;
    },
    { passive: true },
  );

  return { activeDayIndex, scrollToDay };
}
