<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useIsPhoneViewport } from '@/common/composables/useViewport';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';
import { useScheduleDayPager } from '@/modules/schedule/composables/useScheduleDayPager';
import type {
  Lesson,
  LessonGroup,
  ScheduleLayout,
  ScheduleRow,
} from '@/modules/schedule/types';
import { entranceDelay, REVEAL_PACE } from '@/modules/schedule/utils/entrance';

import BaseTableWrapper from '@/common/components/BaseTableWrapper.vue';
import PersonalizedViewNotice from '@/common/components/PersonalizedViewNotice.vue';
import ScheduleHeader from '../components/ScheduleHeader.vue';
import ScheduleStartTimeColumn from '../components/ScheduleStartTimeColumn.vue';
import ScheduleBreakDivider from '../components/ScheduleBreakDivider.vue';
import ScheduleLessonGroup from '../components/ScheduleLessonGroup.vue';
import ScheduleCellSkeleton from '../components/ScheduleCellSkeleton.vue';
import ScheduleDayTrack from '../components/ScheduleDayTrack.vue';

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
  formatDayName,
  formatDayDate,
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

const lessonEntrancePace = ref(loadingLessons.value ? REVEAL_PACE : 1);

watch(loadingLessons, (loading) => {
  if (loading) {
    lessonEntrancePace.value = REVEAL_PACE;
  } else if (!hasPaged.value) {
    enterDay(defaultDayIndex.value);
  }
});

const lessonEntranceStyle = (
  group: Lesson[],
  column: number,
  layout: ScheduleLayout,
) => ({
  '--enter-delay': entranceDelay(
    column,
    layout.gridRowOfSlot(group[0]?.slot ?? 1),
    lessonEntrancePace.value,
  ),
});

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

const weekDividers = computed(() =>
  days.flatMap(
    (day, dayIndex) => rowsOfDay(weekLayout.value, day, dayIndex + 2).dividers,
  ),
);

type LessonRow = Extract<ScheduleRow, { kind: 'lesson' }>;

const lessonRowsOf = (layout: ScheduleLayout) =>
  layout.rows.filter((row): row is LessonRow => row.kind === 'lesson');

/*
 * Skeletons find their slot's row through the slot variables, not a fixed row
 * number: the loaded layout can insert rows, and a skeleton still fading out
 * would otherwise sit on the row that took its place and stretch it until
 * removed.
 */
const gridStyleOf = (layout: ScheduleLayout) => ({
  gridTemplateRows: `auto repeat(${layout.rows.length}, auto)`,
  ...Object.fromEntries(
    lessonRowsOf(layout).map((row) => [
      `--slot-${row.slot}-row`,
      String(row.gridRow),
    ]),
  ),
});

const weekGridStyle = computed(() => gridStyleOf(weekLayout.value));

const lessonGroups = computed<Array<LessonGroup & { dayIndex: number }>>(() =>
  loadingLessons.value
    ? []
    : groupedLessons.value.map((group) => ({
        ...group,
        dayIndex: days.indexOf(group.day),
      })),
);

const phonePanelOf = (day: number) => {
  const layout = dayLayouts.value.get(day) ?? weekLayout.value;
  return {
    layout,
    gridStyle: gridStyleOf(layout),
    rows: rowsOfDay(layout, day, 2),
    lessonGroups: lessonGroups.value.filter((group) => group.day === day),
  };
};

const showPersonalizedNotice = computed(
  () =>
    !!isPersonalized.value &&
    hiddenLessonCount.value > 0 &&
    !loadingLessons.value,
);

const skeletonCells = computed(() => {
  if (!loadingLessons.value) return [];
  const columns = isPhone.value ? [2] : days.map((_, dayIdx) => dayIdx + 2);
  return columns.flatMap((column) =>
    lessonRowsOf(weekLayout.value).map((row) => ({
      key: `skel-${column}-${row.slot}`,
      column,
      row: row.gridRow,
      slot: row.slot,
    })),
  );
});
</script>

<template>
  <div class="p-4 space-y-4">
    <ScheduleHeader
      class="animate-enter"
      :loading="loadingSubs || loadingLessons"
      :is-personalized="!!isPersonalized"
    />

    <PersonalizedViewNotice :show="showPersonalizedNotice" />

    <ScheduleDayTrack
      v-if="isPhone"
      :pager="dayPager"
      :days="days"
      :tab-label="formatDayDate"
      :panel-of="phonePanelOf"
      :panel-key="panelKey"
    >
      <template #default="{ day, dayIndex, panel }">
        <ScheduleStartTimeColumn
          :rows="panel.layout.rows"
          :labelled-rows="panel.rows.labelledRows"
          :animated="!hasPaged"
        />

        <div
          :key="day"
          class="px-2 text-center font-bold text-base [grid-column:2] [grid-row:1]"
          :class="[
            day === currentDay ? 'text-action' : 'text-on-ghost-muted',
            { 'animate-enter': !hasPaged },
          ]"
          :style="{ '--enter-delay': entranceDelay(2, 1) }"
        >
          {{ formatDayName(day) }}
        </div>

        <ScheduleBreakDivider
          v-for="{ key, ...divider } in panel.rows.dividers"
          :key="key"
          v-bind="divider"
          :animated="!hasPaged"
        />

        <TransitionGroup
          leave-active-class="skeleton-leaving transition-opacity duration-400 ease-out"
          leave-to-class="opacity-0"
        >
          <ScheduleCellSkeleton
            v-for="cell in skeletonCells"
            :key="cell.key"
            :grid-column="cell.column"
            :grid-row="cell.row"
            :slot-number="cell.slot"
            radius="lg"
          />
        </TransitionGroup>

        <ScheduleLessonGroup
          v-for="{ key, lessons } in panel.lessonGroups"
          :key="key"
          :group="lessons"
          :group-key="key"
          :is-active="key === activeOrNextGroupKey"
          :is-current-day="day === currentDay"
          :day-index="dayIndex"
          :animated="!hasPaged"
          :get-display-name="getDisplayName"
          :get-group-style="panel.layout.groupStyle"
          :style="lessonEntranceStyle(lessons, 2, panel.layout)"
        />
      </template>
    </ScheduleDayTrack>

    <BaseTableWrapper v-else>
      <div
        class="grid grid-cols-[3.25rem_repeat(5,minmax(9rem,1fr))] gap-2 items-stretch"
        :style="weekGridStyle"
      >
        <ScheduleStartTimeColumn :rows="weekLayout.rows" />

        <div
          v-for="(day, dayIdx) in days"
          :key="day"
          :style="{
            gridColumn: dayIdx + 2,
            '--enter-delay': entranceDelay(dayIdx + 2, 1),
          }"
          class="bg-surface border border-ghost-border text-on-ghost p-2 text-center font-bold rounded-md text-base shadow-input [grid-row:1] animate-enter"
          :class="{
            'bg-linear-to-b from-ghost-border to-ghost-border border-surface-hover-border!':
              day === currentDay,
          }"
        >
          {{ formatDayName(day) }}
        </div>

        <ScheduleBreakDivider
          v-for="{ key, ...divider } in weekDividers"
          :key="key"
          v-bind="divider"
        />

        <TransitionGroup
          leave-active-class="skeleton-leaving transition-opacity duration-400 ease-out"
          leave-to-class="opacity-0"
        >
          <ScheduleCellSkeleton
            v-for="cell in skeletonCells"
            :key="cell.key"
            :grid-column="cell.column"
            :grid-row="cell.row"
            :slot-number="cell.slot"
            radius="md"
          />
        </TransitionGroup>

        <ScheduleLessonGroup
          v-for="{ key, lessons, day, dayIndex } in lessonGroups"
          :key="key"
          :group="lessons"
          :group-key="key"
          :is-active="key === activeOrNextGroupKey"
          :is-current-day="day === currentDay"
          :day-index="dayIndex"
          :get-display-name="getDisplayName"
          :get-group-style="weekLayout.groupStyle"
          :style="lessonEntranceStyle(lessons, dayIndex + 2, weekLayout)"
        />
      </div>
    </BaseTableWrapper>
  </div>
</template>
