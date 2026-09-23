<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';
import { useScheduleRowSync } from '@/modules/schedule/composables/useScheduleRowSync';
import { useScheduleDayPager } from '@/modules/schedule/composables/useScheduleDayPager';
import type { ScheduleRow } from '@/modules/schedule/types';

import BaseTableWrapper from '@/common/components/BaseTableWrapper.vue';
import BaseTabs from '@/common/components/BaseTabs.vue';
import ScheduleHeader from '../components/ScheduleHeader.vue';
import ScheduleStartTimeColumn from '../components/ScheduleStartTimeColumn.vue';
import ScheduleBreakDivider from '../components/ScheduleBreakDivider.vue';
import ScheduleLessonGroup from '../components/ScheduleLessonGroup.vue';
import ScheduleCellSkeleton from '../components/ScheduleCellSkeleton.vue';

const {
  isPersonalized,
  loadingSubs,
  loadingLessons,
  days,
  scheduleRows,
  groupedLessons,
  currentDay,
  activeOrNextGroupKey,
  getDisplayName,
  getGroupStyleWithBreaks,
  defaultDayIndex,
  formatDayName,
} = useSchedule();

const scrollContainerRef = ref<HTMLElement | null>(null);
const daysGridWrapperRef = ref<HTMLElement | null>(null);

const { width: windowWidth } = useWindowSize();
const isCompactLayout = computed(() => windowWidth.value < 501);

const { activeDayIndex, scrollToDay } = useScheduleDayPager(
  scrollContainerRef,
  '.day-header',
);

const dayTabs = computed(() =>
  days.map((day, index) => ({
    id: String(index),
    label: formatDayName(day, 'short'),
  })),
);

const { syncedRowHeights, syncRowHeights } =
  useScheduleRowSync(daysGridWrapperRef);

const animationStartTime = ref(Date.now());
const elapsedLoadTime = ref(0);

const scrollToDefaultDay = () => {
  if (!isCompactLayout.value) return;
  scrollToDay(defaultDayIndex.value, 'auto');
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

type BreakRow = Extract<ScheduleRow, { kind: 'break' }>;

const breakRows = computed(() =>
  scheduleRows.value.filter((row): row is BreakRow => row.kind === 'break'),
);

const skeletonCells = computed(() =>
  days.flatMap((_, dayIdx) =>
    scheduleRows.value
      .filter((row) => row.kind === 'lesson')
      .map((row) => ({ col: dayIdx + 1, gridRow: row.gridRow })),
  ),
);

const desktopGridTemplateRows = computed(
  () => `auto repeat(${scheduleRows.value.length}, auto)`,
);

const compactGridTemplateRows = computed(() =>
  [
    'auto',
    ...scheduleRows.value.map((row) =>
      row.kind === 'lesson' ? 'minmax(58px, auto)' : 'auto',
    ),
  ].join(' '),
);
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="animate-fade-up">
      <ScheduleHeader
        :loading="!!(loadingSubs || loadingLessons)"
        :is-personalized="!!isPersonalized"
      />
    </div>

    <BaseTabs
      v-if="isCompactLayout"
      class="animate-fade-up"
      :items="dayTabs"
      :active-id="String(activeDayIndex)"
      @change="(id) => scrollToDay(Number(id))"
    />

    <BaseTableWrapper class="max-[500px]:overflow-visible">
      <div
        class="grid grid-cols-[3.25rem_repeat(5,minmax(9rem,1fr))] gap-2 items-stretch max-[500px]:flex max-[500px]:overflow-hidden max-[500px]:grid-cols-none max-[500px]:grid-rows-none"
        :style="{ gridTemplateRows: desktopGridTemplateRows }"
      >
        <ScheduleStartTimeColumn
          :rows="scheduleRows"
          :fallback-grid-template-rows="compactGridTemplateRows"
          :grid-template-rows="syncedRowHeights"
        />

        <div
          ref="scrollContainerRef"
          class="max-[500px]:rounded-lg max-[500px]:block max-[500px]:relative max-[500px]:overflow-x-auto max-[500px]:overflow-y-hidden max-[500px]:snap-x max-[500px]:snap-mandatory max-[500px]:flex-1 max-[500px]:overscroll-x-contain max-[500px]:h-full [&::-webkit-scrollbar]:hidden min-[501px]:contents"
        >
          <div
            ref="daysGridWrapperRef"
            class="max-[500px]:grid max-[500px]:grid-cols-[repeat(5,100%)] max-[500px]:gap-2 min-[501px]:contents"
            :style="
              isCompactLayout
                ? { gridTemplateRows: compactGridTemplateRows }
                : {}
            "
          >
            <div
              v-for="(day, dayIdx) in days"
              :key="day"
              :style="{ '--col-desktop': dayIdx + 2 }"
              class="day-header bg-surface border border-ghost-border text-on-ghost p-2 text-center font-bold rounded-md max-[500px]:rounded-lg text-base shadow-input min-[501px]:[grid-row:1] min-[501px]:[grid-column:var(--col-desktop)] max-[500px]:snap-start max-[500px]:snap-always max-[500px]:scroll-ml-0 animate-fade-up"
              :class="
                day === currentDay
                  ? 'min-[501px]:bg-linear-to-b min-[501px]:from-ghost-border min-[501px]:to-ghost-border min-[501px]:border-surface-hover-border!'
                  : ''
              "
            >
              <span class="block">{{ formatDayName(day) }}</span>
            </div>

            <template v-for="(_, dayIdx) in days" :key="`breaks-${dayIdx}`">
              <ScheduleBreakDivider
                v-for="row in breakRows"
                :key="`break-${dayIdx}-${row.gridRow}`"
                :col="dayIdx + 1"
                :grid-row="row.gridRow"
                :duration-mins="row.durationMins"
              />
            </template>

            <template v-if="loadingLessons">
              <ScheduleCellSkeleton
                v-for="cell in skeletonCells"
                :key="`skel-${cell.col}-${cell.gridRow}`"
                :col="cell.col"
                :grid-row="cell.gridRow"
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
                :day-index="group[0] ? days.indexOf(group[0].day) : -1"
                :elapsed-load-time="elapsedLoadTime"
                :get-display-name="getDisplayName"
                :get-group-style="getGroupStyleWithBreaks"
              />
            </template>
          </div>
        </div>
      </div>
    </BaseTableWrapper>
  </div>
</template>
