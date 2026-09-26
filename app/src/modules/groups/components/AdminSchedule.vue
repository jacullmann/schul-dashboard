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
import { useSchedule } from '@/modules/schedule/composables/useSchedule';
import { useScheduleDayPager } from '@/modules/schedule/composables/useScheduleDayPager';
import { entranceDelay } from '@/modules/schedule/utils/entrance';
import {
  groupLessonsBySlot,
  lessonSpan,
  resolveLessonSubject,
  subjectsById,
} from '@/modules/schedule/utils/lesson';

import ScheduleDayTrack from '@/modules/schedule/components/ScheduleDayTrack.vue';
import ScheduleTimeColumn from '@/modules/schedule/components/ScheduleTimeColumn.vue';
import ScheduleStartTimeColumn from '@/modules/schedule/components/ScheduleStartTimeColumn.vue';
import ScheduleLessonGroup from '@/modules/schedule/components/ScheduleLessonGroup.vue';

const {
  formatDayName,
  days,
  timeSlots: fallbackTimeSlots,
  getGroupStyle,
  getDisplayName,
  defaultDayIndex,
} = useSchedule({ autoLoad: false });

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

const groupedLessons = computed(() => groupLessonsBySlot(displayLessons.value));

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

dayPager.showDay(defaultDayIndex.value);

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

const phoneGridStyle = computed(() => ({
  gridTemplateRows: `auto repeat(${slotRows.value.length}, auto)`,
}));

const phonePanelOf = (day: number) => ({
  gridStyle: phoneGridStyle.value,
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

      <div
        class="px-2 text-center font-bold text-base text-on-ghost-muted [grid-column:2] [grid-row:1]"
        :class="{
          'animate-enter': animated && !hasPaged,
          'cursor-pointer select-none': isEditable,
        }"
        :style="{ '--enter-delay': entranceDelay(2, 1) }"
        @click.stop="onSelectDay(day, $event)"
      >
        {{ formatDayName(day) }}
      </div>

      <ScheduleLessonGroup
        v-for="{ key, lessons: group } in panel.lessonGroups"
        :key="key"
        :group="group"
        :group-key="key"
        :is-clickable="true"
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
      class="grid grid-cols-[80px_repeat(5,minmax(9rem,1fr))] grid-rows-[auto_repeat(9,auto)] gap-2 items-stretch"
    >
      <ScheduleTimeColumn
        :time-slots="effectiveTimeSlots"
        :animated="animated"
      />

      <div
        v-for="day in days"
        :key="day"
        class="bg-surface text-on-ghost p-2 border border-ghost-border text-center font-bold rounded-md text-base shadow-input [grid-row:1]"
        :class="[
          isEditable
            ? 'cursor-pointer hover:bg-surface-highlight select-none transition-colors'
            : '',
        ]"
        @click.stop="onSelectDay(day, $event)"
      >
        {{ formatDayName(day) }}
      </div>

      <ScheduleLessonGroup
        v-for="{ key, lessons: group } in groupedLessons"
        :key="key"
        :group="group"
        :group-key="key"
        :is-clickable="true"
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
