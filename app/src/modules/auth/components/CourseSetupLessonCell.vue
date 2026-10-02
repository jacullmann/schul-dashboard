<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Check } from '@lucide/vue';
import type { Lesson } from '@/modules/schedule/types';
import type { CourseState } from '@/modules/auth/utils/courseResolution';
import { lessonDisplayName } from '@/modules/schedule/utils/lesson';
import { courseLabel } from '@/utils/subject-formatter';

const props = defineProps<{
  lessons: Lesson[];
  states: ReadonlyMap<string, CourseState>;
  canToggle: (courseId: string) => boolean;
}>();

const emit = defineEmits<{
  toggle: [courseId: string];
}>();

const i18n = useI18n();
const { t } = i18n;
const te = i18n.te.bind(i18n);

const SETTLED: ReadonlySet<CourseState> = new Set([
  'locked',
  'picked',
  'implied',
]);

const stateOf = (lesson: Lesson) =>
  lesson.courseId ? props.states.get(lesson.courseId) : undefined;

const isSettled = (lesson: Lesson) => {
  const state = stateOf(lesson);
  return state !== undefined && SETTLED.has(state);
};

const isToggleable = (lesson: Lesson) =>
  !!lesson.courseId && props.canToggle(lesson.courseId);

function toggle(lesson: Lesson) {
  if (lesson.courseId && isToggleable(lesson)) emit('toggle', lesson.courseId);
}

const details = (lesson: Lesson) =>
  [lesson.courses?.name && courseLabel(lesson.courses.name, t, te), lesson.room]
    .filter(Boolean)
    .join(' · ');
</script>

<template>
  <div
    class="flex flex-col overflow-hidden rounded-md max-xs:rounded-lg border border-ghost-border bg-surface shadow-input divide-y divide-ghost-border"
  >
    <button
      v-for="lesson in lessons"
      :key="lesson.id"
      type="button"
      class="flex flex-1 flex-col items-start min-w-0 min-h-14 px-2 py-1 max-xs:px-2.5 max-xs:py-1.5 text-left transition-colors duration-150 disabled:cursor-default"
      :class="[
        isSettled(lesson)
          ? 'bg-action text-on-action enabled:hover:bg-action/90'
          : 'text-on-ghost enabled:hover:bg-surface-hover',
        stateOf(lesson) === 'excluded' && 'opacity-40',
        isToggleable(lesson) && 'cursor-pointer',
      ]"
      :disabled="!isToggleable(lesson)"
      :aria-pressed="lesson.courseId ? isSettled(lesson) : undefined"
      @click="toggle(lesson)"
    >
      <span class="flex w-full items-center gap-1 font-bold text-base">
        <span
          class="truncate"
          :class="{ 'line-through': stateOf(lesson) === 'excluded' }"
        >
          {{ lessonDisplayName(lesson, t, te) }}
        </span>
        <Check
          v-if="isSettled(lesson)"
          class="shrink-0 ml-auto"
          :size="16"
          aria-hidden="true"
        />
      </span>
      <span
        v-if="details(lesson)"
        class="w-full truncate text-sm"
        :class="
          isSettled(lesson) ? 'text-on-action-muted' : 'text-on-ghost-muted'
        "
      >
        {{ details(lesson) }}
      </span>
    </button>
  </div>
</template>
