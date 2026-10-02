<script setup lang="ts">
import { computed } from 'vue';
import type {
  Lesson,
  LessonGroup,
  ScheduleRow,
  TimeSlot,
} from '@/modules/schedule/types';
import type { CourseState } from '@/modules/auth/utils/courseResolution';
import { useIsPhoneViewport } from '@/common/composables/useViewport';
import { useScheduleDisplay } from '@/modules/schedule/composables/useScheduleDisplay';
import { useScheduleDayPager } from '@/modules/schedule/composables/useScheduleDayPager';
import {
  groupOverlappingLessons,
  lessonsSlotRange,
} from '@/modules/schedule/utils/lesson';
import { daysSinceMonday } from '@/modules/schedule/utils/weekday';

import ScheduleDayTrack from '@/modules/schedule/components/ScheduleDayTrack.vue';
import ScheduleStartTimeColumn from '@/modules/schedule/components/ScheduleStartTimeColumn.vue';
import ScheduleDayHeader from '@/modules/schedule/components/ScheduleDayHeader.vue';
import CourseSetupLessonCell from './CourseSetupLessonCell.vue';

const props = defineProps<{
  lessons: Lesson[];
  timeSlots: TimeSlot[];
  states: ReadonlyMap<string, CourseState>;
  canToggle: (courseId: string) => boolean;
}>();

const emit = defineEmits<{
  toggle: [courseId: string];
}>();

const { days, formatDayName } = useScheduleDisplay();

// Parallel courses of one slot share a cell, the way the schedule shows them.
const lessonGroups = computed(() => groupOverlappingLessons(props.lessons));

const slotRows = computed<ScheduleRow[]>(() =>
  props.timeSlots.map((ts) => ({
    kind: 'lesson',
    gridRow: ts.slot + 1,
    slot: ts.slot,
    startTime: ts.startTime,
  })),
);

const gridStyle = computed(() => ({
  gridTemplateRows: `auto repeat(${slotRows.value.length}, auto)`,
}));

const cellStyle = (group: LessonGroup, column: number) => {
  const { firstSlot, lastSlot } = lessonsSlotRange(group.lessons);
  return { gridColumn: column, gridRow: `${firstSlot + 1} / ${lastSlot + 2}` };
};

const isPhone = useIsPhoneViewport();
const dayPager = useScheduleDayPager(days.length);
const todayIndex = daysSinceMonday(new Date());
dayPager.showDay(todayIndex < days.length ? todayIndex : 0);

const phonePanelOf = (day: number) => ({
  gridStyle: gridStyle.value,
  lessonGroups: lessonGroups.value.filter((group) => group.day === day),
});

// A template for every week, so its days carry no date.
const dayTabLabel = (day: number) => formatDayName(day, 'short');
</script>

<template>
  <ScheduleDayTrack
    v-if="isPhone"
    :pager="dayPager"
    :days="days"
    :tab-label="dayTabLabel"
    :panel-of="phonePanelOf"
    :animated="false"
  >
    <template #default="{ day, panel }">
      <ScheduleStartTimeColumn :rows="slotRows" :animated="false" />
      <ScheduleDayHeader
        :grid-column="2"
        :label="formatDayName(day)"
        :animated="false"
      />
      <CourseSetupLessonCell
        v-for="group in panel.lessonGroups"
        :key="group.key"
        :style="cellStyle(group, 2)"
        :lessons="group.lessons"
        :states="states"
        :can-toggle="canToggle"
        @toggle="emit('toggle', $event)"
      />
    </template>
  </ScheduleDayTrack>

  <BaseTableWrapper v-else>
    <div
      class="grid grid-cols-[3.25rem_repeat(5,minmax(9rem,1fr))] gap-2 items-stretch"
      :style="gridStyle"
    >
      <ScheduleStartTimeColumn :rows="slotRows" :animated="false" />
      <ScheduleDayHeader
        v-for="(day, dayIndex) in days"
        :key="day"
        :grid-column="dayIndex + 2"
        :label="formatDayName(day)"
        :animated="false"
      />
      <CourseSetupLessonCell
        v-for="group in lessonGroups"
        :key="group.key"
        :style="cellStyle(group, days.indexOf(group.day) + 2)"
        :lessons="group.lessons"
        :states="states"
        :can-toggle="canToggle"
        @toggle="emit('toggle', $event)"
      />
    </div>
  </BaseTableWrapper>
</template>
