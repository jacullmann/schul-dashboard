<script setup lang="ts">
import { computed } from 'vue';
import { Plus } from '@lucide/vue';
import type {
  Lesson,
  ScheduleRow,
  ScheduleSubject,
  TimeSlot,
} from '@/modules/schedule/types';
import { useIsPhoneViewport } from '@/common/composables/useViewport';
import { useScheduleDisplay } from '@/modules/schedule/composables/useScheduleDisplay';
import { useScheduleDayPager } from '@/modules/schedule/composables/useScheduleDayPager';
import { entranceDelay } from '@/modules/schedule/utils/entrance';
import { daysSinceMonday } from '@/modules/schedule/utils/weekday';
import {
  groupOverlappingLessons,
  lessonSpan,
  resolveLessonSubject,
  subjectsById,
} from '@/modules/schedule/utils/lesson';

import ScheduleDayTrack from '@/modules/schedule/components/ScheduleDayTrack.vue';
import ScheduleStartTimeColumn from '@/modules/schedule/components/ScheduleStartTimeColumn.vue';
import ScheduleDayHeader from '@/modules/schedule/components/ScheduleDayHeader.vue';
import ScheduleLessonGroup from '@/modules/schedule/components/ScheduleLessonGroup.vue';

const {
  formatDayName,
  days,
  timeSlots: fallbackTimeSlots,
  getGroupStyle,
  getDisplayName,
} = useScheduleDisplay();

const props = withDefaults(
  defineProps<{
    lessons: Lesson[];
    subjects?: ScheduleSubject[];
    selectedLessonId?: string;
    selectedLessonIds?: string[];
    isEditable?: boolean;
    animated?: boolean;
    individualCourses?: boolean;
    timeSlots?: TimeSlot[];
  }>(),
  {
    animated: true,
    isEditable: false,
    individualCourses: false,
    selectedLessonIds: () => [],
  },
);

const emit = defineEmits<{
  (e: 'select-lesson', lesson: Lesson, event?: MouseEvent): void;
  (e: 'select-day', day: number, event?: MouseEvent): void;
  (e: 'add-lesson', payload: { day: number; slot: number }): void;
  (e: 'contextmenu-lesson', lesson: Lesson, event: UIEvent): void;
}>();

const effectiveTimeSlots = computed(() =>
  props.timeSlots?.length ? props.timeSlots : fallbackTimeSlots.value,
);

const displayLessons = computed(() => {
  if (!props.lessons || props.lessons.length === 0) return [];
  if (!props.subjects || props.subjects.length === 0) return props.lessons;

  const subjectMap = subjectsById(props.subjects);

  return props.lessons.map((lesson) => {
    const { subjects, courses, ownCourse } = resolveLessonSubject(
      lesson,
      subjectMap,
    );

    // A lesson bound to a course speaks for itself; only lessons that stand for
    // every course of their subject get the summarised course info.
    if (ownCourse) {
      return {
        ...lesson,
        courseId: ownCourse.id,
        courseName: ownCourse.name,
        courses: ownCourse,
        subjects,
      };
    }

    if (props.individualCourses || courses.length > 1) {
      return {
        ...lesson,
        ...(courses.length > 1 && !props.individualCourses
          ? { courseCount: courses.length }
          : {}),
        subjects,
      };
    }

    const [c] = courses;
    if (c) {
      return {
        ...lesson,
        courseId: c.id,
        courseName: c.name,
        courses: { id: c.id, name: c.name },
        subjects,
      };
    }

    return {
      ...lesson,
      subjects,
    };
  });
});

const groupedLessons = computed(() =>
  groupOverlappingLessons(displayLessons.value),
);

const coveredSlots = computed(() => {
  const set = new Set<string>();
  (props.lessons || []).forEach((lesson) => {
    const d = Number(lesson.day);
    const s = Number(lesson.slot);
    for (let i = 0; i < lessonSpan(lesson); i++) {
      set.add(`${d}-${s + i}`);
    }
  });
  return set;
});

const emptySlotsOf = (day: number) =>
  effectiveTimeSlots.value.filter(
    (ts) => !coveredSlots.value.has(`${day}-${ts.slot}`),
  );

const onSelectLesson = (lesson: Lesson, event?: MouseEvent) => {
  emit('select-lesson', lesson, event);
};

// Adds another lesson to a slot that is already taken, which in an Abitur
// group is how a second course of the same hour gets scheduled.
const onAddToGroup = (group: Lesson[]) => {
  const [first] = group;
  if (!first) return;
  emit('add-lesson', { day: Number(first.day), slot: Number(first.slot) });
};

const onSelectDay = (day: number, event?: MouseEvent) => {
  if (props.isEditable) {
    emit('select-day', day, event);
  }
};

const isPhone = useIsPhoneViewport();

const dayPager = useScheduleDayPager(days.length);
const { hasPaged } = dayPager;

const todayIndex = daysSinceMonday(new Date());
dayPager.showDay(todayIndex < days.length ? todayIndex : 0);

// The admin schedule is a template for every week, so its days carry no date.
const dayTabLabel = (day: number) => formatDayName(day, 'short');

const slotRows = computed<ScheduleRow[]>(() =>
  effectiveTimeSlots.value.map((ts) => ({
    kind: 'lesson',
    gridRow: ts.slot + 1,
    slot: ts.slot,
    startTime: ts.startTime,
  })),
);

const gridStyle = computed(() => ({
  gridTemplateRows: `auto repeat(${slotRows.value.length}, auto)`,
}));

const phonePanelOf = (day: number) => ({
  gridStyle: gridStyle.value,
  lessonGroups: groupedLessons.value.filter((group) => group.day === day),
});

// On a phone every day is its own table, its lessons beside the time column.
const phoneGroupStyle = (group: Lesson[]) => ({
  ...getGroupStyle(group),
  '--col-mobile': '2 / span 1',
});

const phoneEntranceStyle = (group: Lesson[]) => ({
  '--enter-delay': entranceDelay(2, (group[0]?.slot ?? 1) + 1),
});
</script>

<template>
  <ScheduleDayTrack
    v-if="isPhone"
    :pager="dayPager"
    :days="days"
    :tab-label="dayTabLabel"
    :panel-of="phonePanelOf"
    :animated="animated"
    bleed-class="-mx-6 px-6"
  >
    <template #default="{ day, panel }">
      <ScheduleStartTimeColumn
        :rows="slotRows"
        :animated="animated && !hasPaged"
      />

      <ScheduleDayHeader
        :grid-column="2"
        :label="formatDayName(day)"
        :is-clickable="isEditable"
        :animated="animated && !hasPaged"
        @click.stop="onSelectDay(day, $event)"
      />

      <ScheduleLessonGroup
        v-for="{ key, lessons: group } in panel.lessonGroups"
        :key="key"
        :group="group"
        :group-key="key"
        is-clickable
        :has-context-menu="isEditable"
        :selected-lesson-id="selectedLessonId"
        :selected-lesson-ids="selectedLessonIds"
        :animated="animated && !hasPaged"
        :can-add-lesson="isEditable && individualCourses"
        :get-display-name="getDisplayName"
        :get-group-style="phoneGroupStyle"
        :style="phoneEntranceStyle(group)"
        @select-lesson="onSelectLesson"
        @contextmenu-lesson="(l, ev) => emit('contextmenu-lesson', l, ev)"
        @add-lesson="onAddToGroup(group)"
      />

      <template v-if="isEditable">
        <button
          v-for="ts in emptySlotsOf(day)"
          :key="`empty-${ts.slot}`"
          type="button"
          class="min-h-[54px] border border-dashed border-ghost-border hover:border-action/50 hover:bg-action/5 rounded-lg transition-all flex items-center justify-center group cursor-pointer [grid-column:2]"
          :style="{ gridRow: ts.slot + 1 }"
          @click.stop="emit('add-lesson', { day, slot: ts.slot })"
        >
          <Plus
            class="text-on-ghost-muted group-hover:text-action transition-transform group-hover:scale-110"
            :size="20"
          />
        </button>
      </template>
    </template>
  </ScheduleDayTrack>

  <BaseTableWrapper v-else>
    <div
      class="grid grid-cols-[3.25rem_repeat(5,minmax(9rem,1fr))] gap-2 items-stretch"
      :style="gridStyle"
    >
      <ScheduleStartTimeColumn :rows="slotRows" :animated="animated" />

      <ScheduleDayHeader
        v-for="(day, dayIdx) in days"
        :key="day"
        :grid-column="dayIdx + 2"
        :label="formatDayName(day)"
        :is-clickable="isEditable"
        :animated="animated"
        @click.stop="onSelectDay(day, $event)"
      />

      <ScheduleLessonGroup
        v-for="{ key, lessons: group } in groupedLessons"
        :key="key"
        :group="group"
        :group-key="key"
        is-clickable
        :has-context-menu="isEditable"
        :selected-lesson-id="selectedLessonId"
        :selected-lesson-ids="selectedLessonIds"
        :animated="animated"
        :can-add-lesson="isEditable && individualCourses"
        :get-display-name="getDisplayName"
        :get-group-style="getGroupStyle"
        @select-lesson="onSelectLesson"
        @contextmenu-lesson="(l, ev) => emit('contextmenu-lesson', l, ev)"
        @add-lesson="onAddToGroup(group)"
      />

      <template v-if="isEditable">
        <template v-for="day in days" :key="`empty-day-${day}`">
          <button
            v-for="ts in emptySlotsOf(day)"
            :key="`empty-${day}-${ts.slot}`"
            type="button"
            class="min-h-[54px] border border-dashed border-ghost-border hover:border-action/50 hover:bg-action/5 rounded-xl transition-all flex items-center justify-center group cursor-pointer"
            :style="{ gridColumn: day + 1, gridRow: ts.slot + 1 }"
            @click.stop="emit('add-lesson', { day, slot: ts.slot })"
          >
            <Plus
              class="text-on-ghost-muted group-hover:text-action transition-transform group-hover:scale-110"
              :size="20"
            />
          </button>
        </template>
      </template>
    </div>
  </BaseTableWrapper>
</template>
