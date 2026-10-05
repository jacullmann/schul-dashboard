<script setup lang="ts">
import { ref, shallowRef, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useIsPhoneViewport } from '@/common/composables/useViewport';
import { useDismissibleNotice } from '@/common/composables/useDismissibleNotice';
import { useSchedule } from '@/modules/schedule/composables/useSchedule';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useSchedulePager } from '@/modules/schedule/composables/useSchedulePager';
import { useWeekCache } from '@/modules/schedule/composables/useWeekCache';
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
import { SCHOOL_DAYS } from '@/modules/schedule/utils/weekday';

import PersonalizedViewNotice from '@/common/components/PersonalizedViewNotice.vue';
import ScheduleHeader from '../components/ScheduleHeader.vue';
import ScheduleGrid from '../components/ScheduleGrid.vue';
import ScheduleBreakDivider from '../components/ScheduleBreakDivider.vue';
import ScheduleLessonGroup from '../components/ScheduleLessonGroup.vue';
import ScheduleCellSkeleton from '../components/ScheduleCellSkeleton.vue';
import ScheduleChangeModal from '../components/ScheduleChangeModal.vue';
import ScheduleWeekNav from '../components/ScheduleWeekNav.vue';

// Pages run on past Friday into the following weeks, and back before Monday.
const dayPager = useSchedulePager();
const { hasPaged, selectedPage, showPage } = dayPager;

const shownWeek = computed(() =>
  Math.floor(selectedPage.value / SCHOOL_DAYS.length),
);

const {
  isPersonalized,
  hiddenLessonCount,
  loadingSubs,
  loadingLessons,
  days,
  scheduleOfWeek,
  todayWeek,
  todayPage,
  activeOrNextGroupKey,
  getDisplayName,
  defaultPage,
  weekKeyOf,
  formatDayDate,
  formatDayHeading,
  formatWeekMonth,
  formatColumnHeading,
  formatDayInitials,
  lessons: scheduledLessons,
  substitutionsOf,
  substitutionsLoadedFor,
  loadSubstitutions,
} = useSchedule(shownWeek);

const { t } = useI18n();

const isPhone = useIsPhoneViewport();

/*
 * The day first shown on a phone keeps its panel when the loaded lessons move
 * it to another day, so its skeletons crossfade into that day's lessons
 * instead of a fresh panel playing the entrance a second time.
 */
const entrancePage = ref(defaultPage.value);

const panelKey = (page: number) =>
  page === entrancePage.value ? 'entrance' : page;

const enterPage = (page: number) => {
  entrancePage.value = page;
  showPage(page);
};

enterPage(defaultPage.value);

watch(loadingLessons, (loading) => {
  if (!loading && !hasPaged.value) enterPage(defaultPage.value);
});

/** The days stay selected as the weeks change. */
const shiftWeek = (weeks: -1 | 1) =>
  showPage(selectedPage.value + weeks * days.length);

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
  week: number,
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

  const { lastAttendedSlotByDay, lastShownSlotByDay } = scheduleOfWeek(week);
  const lastAttendedSlot = lastAttendedSlotByDay.get(day);
  const lastShownSlot = lastShownSlotByDay.get(day) ?? 0;
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

const shownWeekLayout = computed(
  () => scheduleOfWeek(shownWeek.value).weekLayout,
);

const dayLayoutOf = (day: number, week: number) =>
  scheduleOfWeek(week).dayLayouts.get(day) ?? scheduleOfWeek(week).weekLayout;

const weekRowsOf = useWeekCache(
  (week) =>
    new Map(
      days.map((day, dayIndex) => [
        day,
        rowsOfDay(scheduleOfWeek(week).weekLayout, day, week, dayIndex + 2),
      ]),
    ),
);

const phoneRowsOf = useWeekCache(
  (week) =>
    new Map(
      days.map((day) => [day, rowsOfDay(dayLayoutOf(day, week), day, week, 2)]),
    ),
);

const dividersOf = (day: number, week: number) =>
  (isPhone.value ? phoneRowsOf : weekRowsOf)(week).get(day)?.dividers ?? [];

const labelledRowsOf = (day: number, week: number) =>
  phoneRowsOf(week).get(day)?.labelledRows;

const lessonGroupsOfWeek = useWeekCache<ReadonlyMap<number, LessonGroup[]>>(
  (week) =>
    loadingLessons.value
      ? new Map()
      : lessonGroupsByDay(scheduleOfWeek(week).groupedLessons),
);

const lessonGroupsOf = (day: number, week: number) =>
  lessonGroupsOfWeek(week).get(day) ?? [];

const isActiveGroup = (key: string, week: number) =>
  week === todayWeek.value && key === activeOrNextGroupKey.value;

const { checkPermission } = useAppAuth();
const canManageScheduleChanges = computed(() =>
  checkPermission('manage_schedule_changes'),
);

/*
 * A lesson opens with its existing change filled in, so it only becomes
 * clickable once its week's changes are known; otherwise saving would
 * silently replace a change the form never showed.
 */
const canChangeLessonsIn = (week: number) =>
  canManageScheduleChanges.value && substitutionsLoadedFor(week);

const changedLesson = ref<Lesson | null>(null);
const changedWeek = ref(0);

const existingChange = computed(() => {
  const lessonId = changedLesson.value?.id;
  if (!lessonId) return null;
  return (
    substitutionsOf(changedWeek.value).find(
      (sub) => sub.lessonId === lessonId,
    ) ?? null
  );
});

/*
 * A change targets the lesson as the weekly schedule holds it, not the copy
 * split off for the member's own course or already showing earlier changes.
 */
function openChangeModal(lesson: Lesson, week: number) {
  const scheduledId = lesson._originalId ?? lesson.id;
  changedWeek.value = week;
  changedLesson.value =
    scheduledLessons.value.find(({ id }) => id === scheduledId) ?? null;
}

function onChangeSaved() {
  changedLesson.value = null;
  void loadSubstitutions(changedWeek.value);
}

const personalizedNotice = useDismissibleNotice('personalizedSchedule');

const showPersonalizedNotice = computed(
  () =>
    !personalizedNotice.isDismissed.value &&
    !!isPersonalized.value &&
    hiddenLessonCount.value > 0 &&
    !loadingLessons.value,
);

const skeletonRows = computed(() =>
  loadingLessons.value ? lessonRowsOf(shownWeekLayout.value) : [],
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

    <ScheduleWeekNav
      v-if="!isPhone"
      class="mb-2 animate-enter"
      :label="formatWeekMonth(shownWeek)"
      @shift="shiftWeek"
    />

    <ScheduleGrid
      :pager="dayPager"
      :layout="shownWeekLayout"
      :day-layout="dayLayoutOf"
      :labelled-rows="labelledRowsOf"
      :tab-label="formatDayDate"
      :tab-caption="formatDayInitials"
      :day-heading="formatDayHeading"
      :column-heading="formatColumnHeading"
      :panel-key="panelKey"
      :current-page="todayPage"
    >
      <template #default="{ day, week, column, layout, animated }">
        <ScheduleBreakDivider
          v-for="{ key, ...divider } in dividersOf(day, week)"
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
          v-for="{ key, lessons } in lessonGroupsOf(day, week)"
          :key="key"
          v-entrance-start="entranceStart"
          :group="lessons"
          :is-active="isActiveGroup(key, week)"
          :animated="animated"
          :get-display-name="getDisplayName"
          :is-clickable="canChangeLessonsIn(week)"
          :style="[
            layout.groupStyle(lessons, column),
            lessonEntranceStyle(lessons, column, layout),
          ]"
          @select-lesson="(lesson) => openChangeModal(lesson, week)"
        />
      </template>
    </ScheduleGrid>

    <ScheduleChangeModal
      v-if="canManageScheduleChanges"
      :lesson="changedLesson"
      :change="existingChange"
      :week-start="weekKeyOf(changedWeek)"
      :day-label="
        changedLesson ? formatDayHeading(changedLesson.day, changedWeek) : ''
      "
      @close="changedLesson = null"
      @saved="onChangeSaved"
    />
  </div>
</template>
