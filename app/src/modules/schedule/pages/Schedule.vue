<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useResizeObserver, useWindowSize } from '@vueuse/core';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';

import ScheduleHeader from '../components/ScheduleHeader.vue';
import ScheduleTimeColumn from '../components/ScheduleTimeColumn.vue';
import ScheduleLessonGroup from '../components/ScheduleLessonGroup.vue';

const {
  isPersonalized,
  loadingSubs,
  loadingLessons,
  days,
  timeSlots,
  groupedLessons,
  currentDay,
  activeOrNextGroupKey,
  getDisplayName,
  getGroupStyle,
  defaultDayIndex,
  formatDayName
} = useSchedule();

const scrollContainerRef = ref<HTMLElement | null>(null);
const timeColWrapperRef = ref<HTMLElement | null>(null);
const daysGridWrapperRef = ref<HTMLElement | null>(null);

const { width: windowWidth } = useWindowSize();

const syncRowHeights = () => {
  if (windowWidth.value >= 501) {
    if (timeColWrapperRef.value) {
      timeColWrapperRef.value.style.gridTemplateRows = '';
    }
    return;
  }
  if (daysGridWrapperRef.value && timeColWrapperRef.value) {
    const styles = window.getComputedStyle(daysGridWrapperRef.value);
    timeColWrapperRef.value.style.gridTemplateRows = styles.gridTemplateRows;
  }
};

const scrollToDefaultDay = () => {
  if (!scrollContainerRef.value || windowWidth.value > 500) return;
  const dayIndex = defaultDayIndex.value;
  const dayHeaders = scrollContainerRef.value.querySelectorAll('.day-header');
  if (dayHeaders[dayIndex]) {
    const header = dayHeaders[dayIndex] as HTMLElement;
    scrollContainerRef.value.scrollTo({ left: header.offsetLeft, behavior: 'auto' });
  }
};

useResizeObserver(daysGridWrapperRef, syncRowHeights);

watch(loadingLessons, (newVal) => {
  if (!newVal) {
    setTimeout(() => {
      syncRowHeights();
      scrollToDefaultDay();
    }, 100);
  }
});

onMounted(() => {
  if (!loadingLessons.value) {
    setTimeout(() => {
      syncRowHeights();
      scrollToDefaultDay();
    }, 100);
  }
});
</script>

<template>
  <div class="p-4 md:p-0 overflow-x-auto">
    <ScheduleHeader 
      :loading="!!(loadingSubs || loadingLessons)" 
      :is-personalized="!!isPersonalized" 
    />

    <div class="grid grid-cols-[80px_repeat(5,1fr)] grid-rows-[auto_repeat(9,auto)] gap-2 items-stretch max-[500px]:flex max-[500px]:overflow-hidden max-[500px]:grid-cols-none max-[500px]:grid-rows-none">
      
      <div ref="timeColWrapperRef" class="min-[501px]:contents">
        <ScheduleTimeColumn :time-slots="timeSlots" />
      </div>

      <div ref="scrollContainerRef" class="max-[500px]:block max-[500px]:relative max-[500px]:overflow-x-auto max-[500px]:overflow-y-hidden max-[500px]:snap-x max-[500px]:snap-mandatory max-[500px]:flex-1 max-[500px]:overscroll-x-none max-[500px]:h-full max-[500px]:[scrollbar-width:none] min-[501px]:contents">
        <div ref="daysGridWrapperRef" class="max-[500px]:grid max-[500px]:grid-cols-[repeat(5,100%)] max-[500px]:grid-rows-[auto_repeat(9,minmax(35px,auto))] max-[500px]:gap-2 min-[501px]:contents">
          
          <div
            v-for="day in days"
            :key="day"
            class="day-header bg-surface text-on-surface p-2 border border-surface-border text-center font-bold rounded-md text-body shadow-input min-w-[150px] min-[501px]:[grid-row:1] max-[500px]:snap-start max-[500px]:scroll-ml-0"
            :class="{'bg-surface-hover border-surface-hover-border': day === currentDay}"
          >
            {{ formatDayName(day) }}
          </div>

          <ScheduleLessonGroup
            v-for="(group, key) in groupedLessons"
            :key="key"
            :group="group"
            :group-key="String(key)"
            :is-active="key === activeOrNextGroupKey"
            :is-current-day="group[0]?.day === currentDay"
            :get-display-name="getDisplayName"
            :get-group-style="getGroupStyle"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.max-\[500px\]\:\[scrollbar-width\:none\]::-webkit-scrollbar {
  display: none;
}
</style>
