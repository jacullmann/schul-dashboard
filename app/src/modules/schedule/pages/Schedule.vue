<script setup lang="ts">
import { ref, shallowRef, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useIsPhoneViewport } from '@/common/composables/useViewport';
import { useDismissibleNotice } from '@/common/composables/useDismissibleNotice';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';
import { useScheduleDayPager } from '@/modules/schedule/composables/useScheduleDayPager';
import type {
  Lesson,
  LessonGroup,
  ScheduleLayout,
  ScheduleRow,
} from '@/modules/schedule/types';
import {
  holdPendingEntrances,
  useSkeletonHandoff,
  vEntranceStart,
} from '@/common/composables/useSkeletonHandoff';
import { entranceDelay } from '@/modules/schedule/utils/entrance';
import { lessonRowsOf } from '@/modules/schedule/utils/layout';
import { lessonGroupsByDay } from '@/modules/schedule/utils/lesson';

import PersonalizedViewNotice from '@/common/components/PersonalizedViewNotice.vue';
import ScheduleHeader from '../components/ScheduleHeader.vue';
import ScheduleGrid from '../components/ScheduleGrid.vue';
import ScheduleBreakDivider from '../components/ScheduleBreakDivider.vue';
import ScheduleLessonGroup from '../components/ScheduleLessonGroup.vue';
import ScheduleCellSkeleton from '../components/ScheduleCellSkeleton.vue';

const {
  isPersonalized,
  hiddenLessonCount,
  loadingSubs,
  loadingLessons,
  days,
  weekLayout,
  dayLayouts,
  groupedLessons,
  lastShownSlotByDay,
  lastAttendedSlotByDay,
  currentDay,
  activeOrNextGroupKey,
  getDisplayName,
  defaultDayIndex,
  formatDayDate,
  formatDayHeading,
  formatColumnHeading,
  formatDayInitials,
} = useSchedule();

const { t } = useI18n();

const isPhone = useIsPhoneViewport();

const dayPager = useScheduleDayPager(days.length);
const { hasPaged, showDay } = dayPager;

/*
 * The day first shown on a phone keeps its panel when the loaded lessons move
 * it to another day, so its skeletons crossfade into that day's lessons
 * instead of a fresh panel playing the entrance a second time.
 */
const entranceDayIndex = ref(defaultDayIndex.value);

const panelKey = (dayIndex: number) =>
  dayIndex === entranceDayIndex.value ? 'entrance' : dayIndex;

const enterDay = (index: number) => {
  entranceDayIndex.value = index;
  showDay(index);
};

enterDay(defaultDayIndex.value);

watch(loadingLessons, (loading) => {
  if (!loading && !hasPaged.value) enterDay(defaultDayIndex.value);
});

const entranceStart = useSkeletonHandoff(loadingLessons);

/*
 * The row each slot's skeleton timed its entrance by. The loaded layout can
 * insert rows, so a lesson keeps its skeleton's timing to continue its motion.
 */
const skeletonRowOfSlot = shallowRef(new Map<number, number>());

const lessonEntranceStyle = (
  group: Lesson[],
  column: number,
  layout: ScheduleLayout,
) => {
  const slot = group[0]?.slot ?? 1;
  const row = skeletonRowOfSlot.value.get(slot) ?? layout.gridRowOfSlot(slot);
  return { '--enter-delay': entranceDelay(column, row) };
};

type BreakRow = Extract<ScheduleRow, { kind: 'break' }>;

interface Divider {
  key: string;
  gridColumn: number;
  gridRow: number;
  label: string;
}

interface DayRows {
  dividers: Divider[];
  /** The rows a phone labels, once the lessons are known. */
  labelledRows?: ReadonlySet<number>;
}

/*
 * A day's breaks stop at the last lesson the member attends, where the
 * closing divider takes the place of the row that follows it. A phone labels
 * only the rows its day fills: slots up to the last lesson shown and the rows
 * holding a divider.
 */
const rowsOfDay = (
  layout: ScheduleLayout,
  day: number,
  column: number,
): DayRows => {
  const breakDivider = (row: BreakRow): Divider => ({
    key: `break-${column}-${row.gridRow}`,
    gridColumn: column,
    gridRow: row.gridRow,
    label: t('schedule.break', { minutes: row.durationMins }),
  });
  const breakRows = layout.rows.filter(
    (row): row is BreakRow => row.kind === 'break',
  );
  if (loadingLessons.value) return { dividers: breakRows.map(breakDivider) };

  const lastAttendedSlot = lastAttendedSlotByDay.value.get(day);
  const lastShownSlot = lastShownSlotByDay.value.get(day) ?? 0;
  const breaks = breakRows.filter(
    (row) => lastAttendedSlot !== undefined && row.afterSlot < lastAttendedSlot,
  );
  const dayEndRow = layout.rows.find(
    (row) => row.kind !== 'lesson' && row.afterSlot === lastAttendedSlot,
  )?.gridRow;

  const labelledRows = new Set(breaks.map((row) => row.gridRow));
  layout.rows.forEach((row) => {
    if (row.kind === 'lesson' && row.slot <= lastShownSlot) {
      labelledRows.add(row.gridRow);
    }
  });

  const dividers = breaks.map(breakDivider);
  if (dayEndRow !== undefined) {
    labelledRows.add(dayEndRow);
    dividers.push({
      key: `day-end-${column}`,
      gridColumn: column,
      gridRow: dayEndRow,
      label: t('schedule.day_end'),
    });
  }

  return { dividers, labelledRows };
};

const dayLayoutOf = (day: number) =>
  dayLayouts.value.get(day) ?? weekLayout.value;

const weekRowsByDay = computed(
  () =>
    new Map(
      days.map((day, dayIndex) => [
        day,
        rowsOfDay(weekLayout.value, day, dayIndex + 2),
      ]),
    ),
);

const phoneRowsByDay = computed(
  () => new Map(days.map((day) => [day, rowsOfDay(dayLayoutOf(day), day, 2)])),
);

const dividersOf = (day: number) =>
  (isPhone.value ? phoneRowsByDay : weekRowsByDay).value.get(day)?.dividers ??
  [];

const labelledRowsOf = (day: number) =>
  phoneRowsByDay.value.get(day)?.labelledRows;

const lessonGroupsOfDay = computed<ReadonlyMap<number, LessonGroup[]>>(() =>
  loadingLessons.value ? new Map() : lessonGroupsByDay(groupedLessons.value),
);

const lessonGroupsOf = (day: number) => lessonGroupsOfDay.value.get(day) ?? [];

const personalizedNotice = useDismissibleNotice('personalizedSchedule');

const showPersonalizedNotice = computed(
  () =>
    !personalizedNotice.isDismissed.value &&
    !!isPersonalized.value &&
    hiddenLessonCount.value > 0 &&
    !loadingLessons.value,
);

const skeletonRows = computed(() =>
  loadingLessons.value ? lessonRowsOf(weekLayout.value) : [],
);

watch(
  skeletonRows,
  (rows) => {
    if (!rows.length) return;
    skeletonRowOfSlot.value = new Map(
      rows.map(({ slot, gridRow }) => [slot, gridRow]),
    );
  },
  { immediate: true },
);
</script>

<template>
  <div class="p-4">
    <ScheduleHeader
      class="animate-enter"
      :loading="loadingSubs || loadingLessons"
      :is-personalized="!!isPersonalized"
    />

    <PersonalizedViewNotice
      :show="showPersonalizedNotice"
      class="my-4"
      @dismiss="personalizedNotice.dismiss"
    />

    <ScheduleGrid
      :pager="dayPager"
      :layout="weekLayout"
      :day-layout="dayLayoutOf"
      :labelled-rows="labelledRowsOf"
      :tab-label="formatDayDate"
      :tab-caption="formatDayInitials"
      :day-heading="formatDayHeading"
      :column-heading="formatColumnHeading"
      :panel-key="panelKey"
      :current-day="currentDay"
    >
      <template #default="{ day, column, layout, animated }">
        <ScheduleBreakDivider
          v-for="{ key, ...divider } in dividersOf(day)"
          :key="key"
          v-bind="divider"
          :animated="animated"
        />

        <!--
          Leaving skeletons fill their cell without sizing its row, so rows the
          loaded lessons join take their final height as the lessons appear.
        -->
        <TransitionGroup
          leave-active-class="absolute inset-0 **:min-h-0 transition-opacity duration-400 ease-out"
          leave-to-class="opacity-0"
          @before-leave="holdPendingEntrances"
        >
          <ScheduleCellSkeleton
            v-for="row in skeletonRows"
            :key="`skel-${column}-${row.slot}`"
            :grid-column="column"
            :grid-row="row.gridRow"
            :slot-number="row.slot"
            :radius="isPhone ? 'lg' : 'md'"
            :entrance-start="entranceStart"
          />
        </TransitionGroup>

        <ScheduleLessonGroup
          v-for="{ key, lessons } in lessonGroupsOf(day)"
          :key="key"
          v-entrance-start="entranceStart"
          :group="lessons"
          :is-active="key === activeOrNextGroupKey"
          :animated="animated"
          :get-display-name="getDisplayName"
          :style="[
            layout.groupStyle(lessons, column),
            lessonEntranceStyle(lessons, column, layout),
          ]"
        />
      </template>
    </ScheduleGrid>
  </div>
</template>
