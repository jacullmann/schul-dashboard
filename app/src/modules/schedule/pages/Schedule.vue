<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useWindowSize } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';
import { useScheduleDayPager } from '@/modules/schedule/composables/useScheduleDayPager';
import type {
  Lesson,
  ScheduleLayout,
  ScheduleRow,
} from '@/modules/schedule/types';
import { entranceDelay, REVEAL_PACE } from '@/modules/schedule/utils/entrance';

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

/*
 * The day first shown on a phone keeps its panel when the loaded lessons move
 * it to another day, so its skeletons crossfade into that day's lessons
 * instead of a fresh panel playing the entrance a second time.
 */
const entranceDayIndex = ref(defaultDayIndex.value);

const panelKey = (dayIndex: number) =>
  dayIndex === entranceDayIndex.value ? 'entrance' : days[dayIndex];

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

interface DayRows {
  breaks: BreakRow[];
  /** Where the closing divider goes, once the lessons are known. */
  dayEndRow?: number;
  /** The rows a phone labels, once the lessons are known. */
  labelledRows?: ReadonlySet<number>;
}

/*
 * A day's breaks stop at the last lesson the member attends, where the
 * closing divider takes the place of the row that follows it. A phone labels
 * only the rows its day fills: slots up to the last lesson shown and the rows
 * holding a divider.
 */
const rowsOfDay = (layout: ScheduleLayout, day: number): DayRows => {
  const breakRows = layout.rows.filter(
    (row): row is BreakRow => row.kind === 'break',
  );
  if (loadingLessons.value) return { breaks: breakRows };

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
  if (dayEndRow !== undefined) labelledRows.add(dayEndRow);

  return { breaks, dayEndRow, labelledRows };
};

const weekRowsByDay = computed(
  () => new Map(days.map((day) => [day, rowsOfDay(weekLayout.value, day)])),
);

const templateRowsOf = (layout: ScheduleLayout) =>
  `auto repeat(${layout.rows.length}, auto)`;

const lessonGroupsByDay = computed(() => {
  const byDay = new Map<number, Array<[string, Lesson[]]>>();
  Object.entries(groupedLessons.value).forEach(([key, group]) => {
    const day = group[0]?.day;
    if (day === undefined) return;
    byDay.set(day, [...(byDay.get(day) ?? []), [key, group]]);
  });
  return byDay;
});

const phonePanels = computed(() =>
  visibleDayIndexes.value.map((dayIndex) => {
    const day = days[dayIndex] ?? 0;
    const layout = dayLayouts.value.get(day) ?? weekLayout.value;
    return {
      dayIndex,
      day,
      layout,
      rows: rowsOfDay(layout, day),
      lessonGroups: lessonGroupsByDay.value.get(day) ?? [],
    };
  }),
);

type LessonRow = Extract<ScheduleRow, { kind: 'lesson' }>;

const lessonRowsOf = (layout: ScheduleLayout) =>
  layout.rows.filter((row): row is LessonRow => row.kind === 'lesson');

const skeletonCells = computed(() => {
  if (!loadingLessons.value) return [];
  const columns = isCompactLayout.value
    ? [2]
    : days.map((_, dayIdx) => dayIdx + 2);
  return columns.flatMap((column) =>
    lessonRowsOf(weekLayout.value).map((row) => ({
      column,
      row: row.gridRow,
      slot: row.slot,
    })),
  );
});

/*
 * Skeletons find their slot's row through these, not a fixed row number: the
 * loaded layout can insert rows, and a skeleton still fading out would
 * otherwise sit on the row that took its place and stretch it until removed.
 */
const slotRowVariables = (layout: ScheduleLayout) =>
  Object.fromEntries(
    lessonRowsOf(layout).map((row) => [
      `--slot-${row.slot}-row`,
      String(row.gridRow),
    ]),
  );
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="animate-enter">
      <ScheduleHeader
        :loading="!!(loadingSubs || loadingLessons)"
        :is-personalized="!!isPersonalized"
      />
    </div>

    <PersonalizedViewNotice
      :show="!!isPersonalized && hiddenLessonCount > 0 && !loadingLessons"
    />

    <template v-if="isCompactLayout">
      <BaseTabs
        class="animate-enter"
        :style="{ '--enter-delay': entranceDelay(0, 1) }"
        :items="dayTabs"
        :active-id="String(selectedDayIndex)"
        @change="(id) => goToDay(Number(id))"
      />

      <div class="-mx-4 px-4 overflow-hidden">
        <div ref="dayTrackRef" class="relative touch-pan-y">
          <div
            v-for="panel in phonePanels"
            :key="panelKey(panel.dayIndex)"
            class="grid grid-cols-[3.25rem_1fr] gap-2 w-full"
            :class="[
              panel.dayIndex === activeDayIndex
                ? 'relative'
                : 'absolute inset-x-0 top-0',
              { 'transition-transform duration-300 ease-out': settling },
            ]"
            :style="[
              panelStyle(panel.dayIndex),
              { gridTemplateRows: templateRowsOf(panel.layout) },
              slotRowVariables(panel.layout),
            ]"
            @transitionend="onPanelTransitionEnd"
          >
            <ScheduleStartTimeColumn
              :rows="panel.layout.rows"
              :labelled-rows="panel.rows.labelledRows"
              :animated="!hasPaged"
            />

            <div
              :key="panel.day"
              class="px-2 text-center font-bold text-base [grid-column:2] [grid-row:1]"
              :class="[
                panel.day === currentDay
                  ? 'text-action'
                  : 'text-on-ghost-muted',
                { 'animate-enter': !hasPaged },
              ]"
              :style="{ '--enter-delay': entranceDelay(2, 1) }"
            >
              {{ formatDayName(panel.day) }}
            </div>

            <ScheduleBreakDivider
              v-for="row in panel.rows.breaks"
              :key="`break-${row.gridRow}`"
              :grid-column="2"
              :grid-row="row.gridRow"
              :label="t('schedule.break', { minutes: row.durationMins })"
              :animated="!hasPaged"
            />

            <ScheduleBreakDivider
              v-if="panel.rows.dayEndRow !== undefined"
              :grid-column="2"
              :grid-row="panel.rows.dayEndRow"
              :label="t('schedule.day_end')"
              :animated="!hasPaged"
            />

            <TransitionGroup
              leave-active-class="skeleton-leaving transition-opacity duration-400 ease-out"
              leave-to-class="opacity-0"
            >
              <ScheduleCellSkeleton
                v-for="cell in skeletonCells"
                :key="`skel-${cell.slot}`"
                :grid-column="cell.column"
                :grid-row="cell.row"
                :slot-number="cell.slot"
                radius="lg"
              />
            </TransitionGroup>

            <template v-if="!loadingLessons">
              <ScheduleLessonGroup
                v-for="[key, group] in panel.lessonGroups"
                :key="key"
                :group="group"
                :group-key="key"
                :is-active="key === activeOrNextGroupKey"
                :is-current-day="panel.day === currentDay"
                :day-index="panel.dayIndex"
                :animated="!hasPaged"
                :get-display-name="getDisplayName"
                :get-group-style="panel.layout.groupStyle"
                :style="lessonEntranceStyle(group, 2, panel.layout)"
              />
            </template>
          </div>
        </div>
      </div>
    </template>

    <BaseTableWrapper v-else>
      <div
        class="grid grid-cols-[3.25rem_repeat(5,minmax(9rem,1fr))] gap-2 items-stretch"
        :style="[
          { gridTemplateRows: templateRowsOf(weekLayout) },
          slotRowVariables(weekLayout),
        ]"
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
          :class="
            day === currentDay
              ? 'bg-linear-to-b from-ghost-border to-ghost-border border-surface-hover-border!'
              : ''
          "
        >
          <span class="block">{{ formatDayName(day) }}</span>
        </div>

        <template v-for="(day, dayIdx) in days" :key="`breaks-${dayIdx}`">
          <ScheduleBreakDivider
            v-for="row in weekRowsByDay.get(day)?.breaks"
            :key="`break-${dayIdx}-${row.gridRow}`"
            :grid-column="dayIdx + 2"
            :grid-row="row.gridRow"
            :label="t('schedule.break', { minutes: row.durationMins })"
          />

          <ScheduleBreakDivider
            v-if="weekRowsByDay.get(day)?.dayEndRow !== undefined"
            :grid-column="dayIdx + 2"
            :grid-row="weekRowsByDay.get(day)?.dayEndRow ?? 0"
            :label="t('schedule.day_end')"
          />
        </template>

        <TransitionGroup
          leave-active-class="skeleton-leaving transition-opacity duration-400 ease-out"
          leave-to-class="opacity-0"
        >
          <ScheduleCellSkeleton
            v-for="cell in skeletonCells"
            :key="`skel-${cell.column}-${cell.slot}`"
            :grid-column="cell.column"
            :grid-row="cell.row"
            :slot-number="cell.slot"
            radius="md"
          />
        </TransitionGroup>

        <template v-if="!loadingLessons">
          <ScheduleLessonGroup
            v-for="(group, key) in groupedLessons"
            :key="key"
            :group="group"
            :group-key="String(key)"
            :is-active="key === activeOrNextGroupKey"
            :is-current-day="group[0]?.day === currentDay"
            :day-index="group[0] ? days.indexOf(group[0].day) : -1"
            :get-display-name="getDisplayName"
            :get-group-style="weekLayout.groupStyle"
            :style="
              lessonEntranceStyle(
                group,
                group[0] ? days.indexOf(group[0].day) + 2 : 2,
                weekLayout,
              )
            "
          />
        </template>
      </div>
    </BaseTableWrapper>
  </div>
</template>
