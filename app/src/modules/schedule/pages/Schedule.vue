<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';
import { useScheduleDayPager } from '@/modules/schedule/composables/useScheduleDayPager';
import type { Lesson, ScheduleRow } from '@/modules/schedule/types';

import BaseTableWrapper from '@/common/components/BaseTableWrapper.vue';
import BaseTabs from '@/common/components/BaseTabs.vue';
import PersonalizedViewNotice from '@/common/components/PersonalizedViewNotice.vue';
import ScheduleHeader from '../components/ScheduleHeader.vue';
import ScheduleStartTimeColumn from '../components/ScheduleStartTimeColumn.vue';
import ScheduleBreakDivider from '../components/ScheduleBreakDivider.vue';
import ScheduleLessonGroup from '../components/ScheduleLessonGroup.vue';
import ScheduleCellSkeleton from '../components/ScheduleCellSkeleton.vue';

const {
  isPersonalized,
  hiddenLessonCount,
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
  formatDayDate,
} = useSchedule();

const { width: windowWidth } = useWindowSize();
const isCompactLayout = computed(() => windowWidth.value < 501);

const dayTrackRef = ref<HTMLElement | null>(null);

const {
  activeDayIndex,
  selectedDayIndex,
  incomingDayIndex,
  settling,
  hasPaged,
  goToDay,
  showDay,
  panelStyle,
  onPanelTransitionEnd,
} = useScheduleDayPager(dayTrackRef, days.length);

const visibleDayIndexes = computed(() =>
  incomingDayIndex.value === null
    ? [activeDayIndex.value]
    : [activeDayIndex.value, incomingDayIndex.value],
);

const dayTabs = computed(() =>
  days.map((day, index) => ({
    id: String(index),
    label: formatDayDate(day),
  })),
);

const animationStartTime = ref(Date.now());
const elapsedLoadTime = ref(0);

const recordLoadTime = () => {
  elapsedLoadTime.value = (Date.now() - animationStartTime.value) / 1000;
  if (!hasPaged.value) showDay(defaultDayIndex.value);
};

watch(loadingLessons, (loading) => {
  if (loading) {
    animationStartTime.value = Date.now();
  } else {
    recordLoadTime();
  }
});

onMounted(() => {
  if (loadingLessons.value) {
    showDay(defaultDayIndex.value);
  } else {
    recordLoadTime();
  }
});

type BreakRow = Extract<ScheduleRow, { kind: 'break' }>;

const breakRows = computed(() =>
  scheduleRows.value.filter((row): row is BreakRow => row.kind === 'break'),
);

const lessonRows = computed(() =>
  scheduleRows.value.filter((row) => row.kind === 'lesson'),
);

const lessonGroupsByDay = computed(() => {
  const byDay = new Map<number, Array<[string, Lesson[]]>>();
  Object.entries(groupedLessons.value).forEach(([key, group]) => {
    const day = group[0]?.day;
    if (day === undefined) return;
    byDay.set(day, [...(byDay.get(day) ?? []), [key, group]]);
  });
  return byDay;
});

const gridTemplateRows = computed(
  () => `auto repeat(${scheduleRows.value.length}, auto)`,
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

    <PersonalizedViewNotice
      v-if="isPersonalized && hiddenLessonCount > 0 && !loadingLessons"
      class="animate-fade-up"
    />

    <template v-if="isCompactLayout">
      <BaseTabs
        class="animate-fade-up"
        :items="dayTabs"
        :active-id="String(selectedDayIndex)"
        @change="(id) => goToDay(Number(id))"
      />

      <div class="-mx-4 px-4 overflow-hidden">
        <div ref="dayTrackRef" class="relative touch-pan-y">
          <div
            v-for="dayIndex in visibleDayIndexes"
            :key="days[dayIndex]"
            class="grid grid-cols-[3.25rem_1fr] gap-2 w-full"
            :class="[
              dayIndex === activeDayIndex
                ? 'relative'
                : 'absolute inset-x-0 top-0',
              { 'transition-transform duration-300 ease-out': settling },
            ]"
            :style="[panelStyle(dayIndex), { gridTemplateRows }]"
            @transitionend="onPanelTransitionEnd"
          >
            <ScheduleStartTimeColumn
              :rows="scheduleRows"
              :animated="!hasPaged"
            />

            <div
              class="px-2 text-center font-bold text-base [grid-column:2] [grid-row:1]"
              :class="[
                days[dayIndex] === currentDay
                  ? 'text-action'
                  : 'text-on-ghost-muted',
                { 'animate-fade-up': !hasPaged },
              ]"
            >
              {{ formatDayName(days[dayIndex] ?? 0) }}
            </div>

            <ScheduleBreakDivider
              v-for="row in breakRows"
              :key="`break-${row.gridRow}`"
              :grid-column="2"
              :grid-row="row.gridRow"
              :duration-mins="row.durationMins"
              :animated="!hasPaged"
            />

            <template v-if="loadingLessons">
              <ScheduleCellSkeleton
                v-for="row in lessonRows"
                :key="`skel-${row.gridRow}`"
                :grid-column="2"
                :grid-row="row.gridRow"
                radius="lg"
              />
            </template>

            <template v-else>
              <ScheduleLessonGroup
                v-for="[key, group] in lessonGroupsByDay.get(
                  days[dayIndex] ?? 0,
                )"
                :key="key"
                :group="group"
                :group-key="key"
                :is-active="key === activeOrNextGroupKey"
                :is-current-day="days[dayIndex] === currentDay"
                :day-index="dayIndex"
                :elapsed-load-time="elapsedLoadTime"
                :animated="!hasPaged"
                :get-display-name="getDisplayName"
                :get-group-style="getGroupStyleWithBreaks"
              />
            </template>
          </div>
        </div>
      </div>
    </template>

    <BaseTableWrapper v-else>
      <div
        class="grid grid-cols-[3.25rem_repeat(5,minmax(9rem,1fr))] gap-2 items-stretch"
        :style="{ gridTemplateRows }"
      >
        <ScheduleStartTimeColumn :rows="scheduleRows" />

        <div
          v-for="(day, dayIdx) in days"
          :key="day"
          :style="{ gridColumn: dayIdx + 2 }"
          class="bg-surface border border-ghost-border text-on-ghost p-2 text-center font-bold rounded-md text-base shadow-input [grid-row:1] animate-fade-up"
          :class="
            day === currentDay
              ? 'bg-linear-to-b from-ghost-border to-ghost-border border-surface-hover-border!'
              : ''
          "
        >
          <span class="block">{{ formatDayName(day) }}</span>
        </div>

        <template v-for="(_, dayIdx) in days" :key="`breaks-${dayIdx}`">
          <ScheduleBreakDivider
            v-for="row in breakRows"
            :key="`break-${dayIdx}-${row.gridRow}`"
            :grid-column="dayIdx + 2"
            :grid-row="row.gridRow"
            :duration-mins="row.durationMins"
          />
        </template>

        <template v-if="loadingLessons">
          <template v-for="(_, dayIdx) in days" :key="`skel-${dayIdx}`">
            <ScheduleCellSkeleton
              v-for="row in lessonRows"
              :key="`skel-${dayIdx}-${row.gridRow}`"
              :grid-column="dayIdx + 2"
              :grid-row="row.gridRow"
              radius="md"
            />
          </template>
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
    </BaseTableWrapper>
  </div>
</template>
