<script setup lang="ts" generic="Panel extends ScheduleDayPanel">
import { computed } from 'vue';
import BaseTabs from '@/common/components/BaseTabs.vue';
import type { ScheduleDayPanel } from '@/modules/schedule/types';
import type { ScheduleDayPager } from '@/modules/schedule/composables/useScheduleDayPager';
import { entranceDelay } from '@/modules/schedule/utils/entrance';

const props = withDefaults(
  defineProps<{
    pager: ScheduleDayPager;
    days: readonly number[];
    tabLabel: (day: number) => string;
    panelOf: (day: number) => Panel;
    /** Lets a panel stay mounted while its day changes; each day gets its own by default. */
    panelKey?: (dayIndex: number) => PropertyKey;
    animated?: boolean;
    /**
     * Pulls the track out through the padding around it, so days slide in
     * from the edge of the screen instead of the edge of the content.
     */
    bleedClass?: string;
  }>(),
  {
    panelKey: undefined,
    animated: true,
    bleedClass: '-mx-4 px-4',
  },
);

defineSlots<{
  default(slotProps: { day: number; dayIndex: number; panel: Panel }): unknown;
}>();

// The parent creates the pager once and never swaps it.
const {
  trackRef,
  activeDayIndex,
  selectedDayIndex,
  incomingDayIndex,
  settling,
  goToDay,
  panelStyle,
  onPanelTransitionEnd,
} = props.pager;

const tabs = computed(() =>
  props.days.map((day, index) => ({
    id: String(index),
    label: props.tabLabel(day),
  })),
);

const panels = computed(() => {
  const dayIndexes =
    incomingDayIndex.value === null
      ? [activeDayIndex.value]
      : [activeDayIndex.value, incomingDayIndex.value];
  return dayIndexes.map((dayIndex) => {
    const day = props.days[dayIndex] ?? 0;
    return {
      dayIndex,
      day,
      key: props.panelKey?.(dayIndex) ?? day,
      panel: props.panelOf(day),
    };
  });
});
</script>

<template>
  <div class="space-y-4">
    <BaseTabs
      :class="{ 'animate-enter': animated }"
      :style="{ '--enter-delay': entranceDelay(0, 1) }"
      :items="tabs"
      :active-id="String(selectedDayIndex)"
      @change="(id) => goToDay(Number(id))"
    />

    <div class="overflow-hidden" :class="bleedClass">
      <div ref="trackRef" class="relative touch-pan-y">
        <div
          v-for="{ dayIndex, day, key, panel } in panels"
          :key="key"
          class="grid grid-cols-[3.25rem_1fr] gap-2 w-full"
          :class="[
            dayIndex === activeDayIndex
              ? 'relative'
              : 'absolute inset-x-0 top-0',
            { 'transition-transform duration-300 ease-out': settling },
          ]"
          :style="[panelStyle(dayIndex), panel.gridStyle]"
          @transitionend="onPanelTransitionEnd"
        >
          <slot :day="day" :day-index="dayIndex" :panel="panel" />
        </div>
      </div>
    </div>
  </div>
</template>
