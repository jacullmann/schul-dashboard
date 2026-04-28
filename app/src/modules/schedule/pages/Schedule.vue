<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useResizeObserver, useWindowSize } from '@vueuse/core';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';

import ScheduleHeader from '../components/ScheduleHeader.vue';
import ScheduleTimeColumn from '../components/ScheduleTimeColumn.vue';
import ScheduleLessonGroup from '../components/ScheduleLessonGroup.vue';
import ScheduleCellSkeleton from '../components/ScheduleCellSkeleton.vue';

const {
  isPersonalized,
  loadingSubs,
  loadingLessons,
  days,
  weekDates,
  timeSlots,
  groupedLessons,
  currentDay,
  activeOrNextGroupKey,
  getDisplayName,
  getGroupStyle,
  defaultDayIndex,
  formatDayName,
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
    scrollContainerRef.value.scrollTo({
      left: header.offsetLeft,
      behavior: 'auto',
    });
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

/** Flat list of skeleton cell positions: 5 columns × dynamic rows. */
const skeletonCells = computed(() => {
  const rowCount = timeSlots.value.length || 9;
  return days.flatMap((_, dayIdx) =>
    Array.from({ length: rowCount }, (_, rowIdx) => ({
      col: dayIdx + 1,
      row: rowIdx + 1,
    })),
  );
});
</script>

<template>
  <div class="p-4 md:p-0 overflow-x-auto">
    <ScheduleHeader
      :loading="!!(loadingSubs || loadingLessons)"
      :is-personalized="!!isPersonalized"
    />

    <div
      class="grid grid-cols-[80px_repeat(5,1fr)] gap-2 items-stretch max-[500px]:flex max-[500px]:overflow-hidden max-[500px]:grid-cols-none max-[500px]:grid-rows-none"
      :style="{
        gridTemplateRows: `auto repeat(${timeSlots.length || 9}, auto)`,
      }"
    >
      <div ref="timeColWrapperRef" class="min-[501px]:contents">
        <ScheduleTimeColumn :time-slots="timeSlots" />
      </div>

      <div
        ref="scrollContainerRef"
        class="max-[500px]:block max-[500px]:relative max-[500px]:overflow-x-auto max-[500px]:overflow-y-hidden max-[500px]:snap-x max-[500px]:snap-mandatory max-[500px]:flex-1 max-[500px]:overscroll-x-none max-[500px]:h-full [&::-webkit-scrollbar]:hidden min-[501px]:contents"
      >
        <div
          ref="daysGridWrapperRef"
          class="max-[500px]:grid max-[500px]:grid-cols-[repeat(5,100%)] max-[500px]:gap-2 min-[501px]:contents"
          :style="
            windowWidth < 501
              ? {
                  gridTemplateRows: `auto repeat(${timeSlots.length || 9}, minmax(35px, auto))`,
                }
              : {}
          "
        >
          <div
            v-for="day in days"
            :key="day"
            class="day-header bg-surface text-on-ghost p-2 border border-surface-border text-center font-bold rounded-md text-body shadow-input min-w-[150px] min-[501px]:[grid-row:1] max-[500px]:snap-start max-[500px]:scroll-ml-0"
            :class="{
              'bg-surface-hover border-surface-hover-border':
                day === currentDay,
            }"
          >
            <span class="block">{{ formatDayName(day) }}</span>
            <!--span class="block text-[0.75rem] font-normal text-on-ghost-muted mt-0.5">{{
              weekDates[day]
            }}</span-->
          </div>

          <!-- Skeleton: 5 days × 7 rows while lessons are loading -->
          <template v-if="loadingLessons">
            <ScheduleCellSkeleton
              v-for="cell in skeletonCells"
              :key="`skel-${cell.col}-${cell.row}`"
              :col="cell.col"
              :row="cell.row"
            />
          </template>

          <template v-else>
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
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
