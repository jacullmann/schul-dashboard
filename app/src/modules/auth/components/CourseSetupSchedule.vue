<script setup lang="ts">
import { computed } from 'vue';
import type { Lesson, ScheduleConfig } from '@/modules/schedule/types';
import type { CourseState } from '@/modules/auth/utils/courseResolution';
import { useScheduleDisplay } from '@/modules/schedule/composables/useScheduleDisplay';
import { useScheduleDayPager } from '@/modules/schedule/composables/useScheduleDayPager';
import { buildScheduleLayout } from '@/modules/schedule/utils/layout';
import {
  groupOverlappingLessons,
  lessonGroupsByDay,
} from '@/modules/schedule/utils/lesson';

import ScheduleGrid from '@/modules/schedule/components/ScheduleGrid.vue';
import ScheduleLessonGroup from '@/modules/schedule/components/ScheduleLessonGroup.vue';

const props = defineProps<{
  lessons: Lesson[];
  config: ScheduleConfig;
  states: ReadonlyMap<string, CourseState>;
  canToggle: (courseId: string) => boolean;
}>();

const emit = defineEmits<{
  toggle: [courseId: string];
}>();

const SETTLED: ReadonlySet<CourseState> = new Set([
  'locked',
  'picked',
  'implied',
]);

const { days, getDisplayName } = useScheduleDisplay();

const layout = computed(() => buildScheduleLayout(props.config));

// Parallel courses of one slot share a cell, the way the schedule shows them.
const lessonGroupsOfDay = computed(() =>
  lessonGroupsByDay(groupOverlappingLessons(props.lessons)),
);

const lessonGroupsOf = (day: number) => lessonGroupsOfDay.value.get(day) ?? [];

const isSettled = (lesson: Lesson) => {
  const state = lesson.courseId ? props.states.get(lesson.courseId) : undefined;
  return state !== undefined && SETTLED.has(state);
};

// A settled course is highlighted the way a selected lesson is.
const settledLessonIds = computed(
  () => new Set(props.lessons.filter(isSettled).map((lesson) => lesson.id)),
);

const isToggleable = (lesson: Lesson) =>
  !!lesson.courseId && props.canToggle(lesson.courseId);

function toggle(lesson: Lesson) {
  if (lesson.courseId && isToggleable(lesson)) emit('toggle', lesson.courseId);
}

// The choice reads as a week, so a phone starts on Monday whatever today is.
const dayPager = useScheduleDayPager(days.length);
</script>

<template>
  <ScheduleGrid :pager="dayPager" :layout="layout" :animated="false">
    <template #default="{ day, column, layout: dayLayout, animated }">
      <ScheduleLessonGroup
        v-for="{ key, lessons: group } in lessonGroupsOf(day)"
        :key="key"
        :group="group"
        :is-clickable="isToggleable"
        :selected-lesson-ids="settledLessonIds"
        :animated="animated"
        :get-display-name="getDisplayName"
        :style="dayLayout.groupStyle(group, column)"
        @select-lesson="toggle"
      />
    </template>
  </ScheduleGrid>
</template>
