<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';
import { useScheduleRowSync } from '@/modules/schedule/composables/useScheduleRowSync';

import BaseTableWrapper from '@/common/components/BaseTableWrapper.vue';
import ScheduleHeader from '../components/ScheduleHeader.vue';
import ScheduleTimeColumn from '../components/ScheduleTimeColumn.vue';
import ScheduleLessonGroup from '../components/ScheduleLessonGroup.vue';
import ScheduleCellSkeleton from '../components/ScheduleCellSkeleton.vue';

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
  formatDayName,
} = useSchedule();

const scrollContainerRef = ref<HTMLElement | null>(null);
const daysGridWrapperRef = ref<HTMLElement | null>(null);

const { width: windowWidth } = useWindowSize();

const { syncedRowHeights, syncRowHeights } =
  useScheduleRowSync(daysGridWrapperRef);

const animationStartTime = ref(Date.now());
const elapsedLoadTime = ref(0);

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

watch(loadingLessons, (newVal) => {
  if (newVal) {
    animationStartTime.value = Date.now();
  } else {
    elapsedLoadTime.value = (Date.now() - animationStartTime.value) / 1000;
    void nextTick(() => {
      syncRowHeights();
      requestAnimationFrame(syncRowHeights);
      setTimeout(syncRowHeights, 100);
      scrollToDefaultDay();
    });
  }
});

onMounted(() => {
  if (!loadingLessons.value) {
    elapsedLoadTime.value = (Date.now() - animationStartTime.value) / 1000;
    void nextTick(() => {
      syncRowHeights();
      requestAnimationFrame(syncRowHeights);
      setTimeout(syncRowHeights, 100);
      scrollToDefaultDay();
    });
  }
});

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
  <div class="p-4 space-y-4">
    <div class="animate-fade-up">
      <ScheduleHeader
        :loading="!!(loadingSubs || loadingLessons)"
        :is-personalized="!!isPersonalized"
      />
    </div>

    <BaseTableWrapper class="max-[500px]:overflow-visible">
      <div
        class="grid grid-cols-[80px_repeat(5,1fr)] gap-2 items-stretch max-[500px]:flex max-[500px]:overflow-hidden max-[500px]:grid-cols-none max-[500px]:grid-rows-none"
        :style="{
          gridTemplateRows: `auto repeat(${timeSlots.length || 9}, auto)`,
        }"
      >
        <ScheduleTimeColumn
          :time-slots="timeSlots"
          :grid-template-rows="syncedRowHeights"
        />

        <div
          ref="scrollContainerRef"
          class="max-[500px]:rounded-lg max-[500px]:block max-[500px]:relative max-[500px]:overflow-x-auto max-[500px]:overflow-y-hidden max-[500px]:snap-x max-[500px]:snap-mandatory max-[500px]:flex-1 max-[500px]:overscroll-x-none max-[500px]:h-full [&::-webkit-scrollbar]:hidden min-[501px]:contents"
        >
          <div
            ref="daysGridWrapperRef"
            class="max-[500px]:grid max-[500px]:grid-cols-[repeat(5,100%)] max-[500px]:gap-2 min-[501px]:contents"
            :style="
              windowWidth < 501
                ? {
                    gridTemplateRows: `auto repeat(${timeSlots.length || 9}, minmax(58px, auto))`,
                  }
                : {}
            "
          >
            <div
              v-for="day in days"
              :key="day"
              class="day-header bg-surface border border-ghost-border text-on-ghost p-2 text-center font-bold rounded-md max-[500px]:rounded-lg text-base shadow-input min-w-[150px] min-[501px]:[grid-row:1] max-[500px]:snap-start max-[500px]:scroll-ml-0 animate-fade-up"
              :class="
                day === currentDay
                  ? 'min-[501px]:bg-ghost-border! min-[501px]:border-surface-hover-border!'
                  : ''
              "
            >
              <span class="block">{{ formatDayName(day) }}</span>
            </div>

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
                :day-index="days.indexOf(group[0]?.day)"
                :elapsed-load-time="elapsedLoadTime"
                :get-display-name="getDisplayName"
                :get-group-style="getGroupStyle"
              />
            </template>
          </div>
        </div>
      </div>
    </BaseTableWrapper>
  </div>
</template>
