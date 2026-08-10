<script setup lang="ts">
import ScheduleLessonItem from './ScheduleLessonItem.vue';

withDefaults(
  defineProps<{
    group: any[];
    groupKey: string;
    isActive?: boolean;
    isCurrentDay?: boolean;
    isClickable?: boolean;
    selectedLessonId?: string;
    selectedLessonIds?: string[];
    dayIndex?: number;
    elapsedLoadTime?: number;
    animated?: boolean;
    getDisplayName: (l: any) => string;
    getGroupStyle: (g: any[]) => any;
  }>(),
  {
    animated: true,
    selectedLessonId: undefined,
    selectedLessonIds: () => [],
    dayIndex: undefined,
    elapsedLoadTime: 0,
  },
);

const emit = defineEmits<{
  (e: 'select-lesson', lesson: any, event?: MouseEvent): void;
  (e: 'contextmenu-lesson', lesson: any, event: UIEvent): void;
}>();
</script>

<template>
  <div
    class="group bg-surface rounded-md max-[500px]:rounded-lg border border-ghost-border flex flex-col overflow-hidden z-[2] transition-colors duration-300 shadow-input"
    :class="[
      animated ? 'animate-fade-up' : '',
      isActive
        ? 'highlight-active bg-action! border-action!'
        : isCurrentDay
          ? 'current-day min-[501px]:border-surface-hover-border'
          : '',
      'min-[501px]:[grid-column:var(--col-desktop)]',
      'max-[500px]:![grid-column:var(--col-mobile)] max-[500px]:[scroll-snap-align:start] max-[500px]:[scroll-margin-left:0]',
    ]"
    :style="getGroupStyle(group)"
  >
    <ScheduleLessonItem
      v-for="(lesson, index) in group"
      :key="index"
      :lesson="lesson"
      :has-border="index < group.length - 1"
      :is-clickable="isClickable"
      :is-selected="
        (Boolean(selectedLessonId) &&
          (selectedLessonId === lesson.id ||
            selectedLessonId === lesson._originalId)) ||
        (Boolean(selectedLessonIds) &&
          (selectedLessonIds.includes(lesson.id) ||
            (Boolean(lesson._originalId) &&
              selectedLessonIds.includes(lesson._originalId))))
      "
      :get-display-name="getDisplayName"
      @select="(l, ev) => emit('select-lesson', l, ev)"
      @contextmenu="(l, ev) => emit('contextmenu-lesson', l, ev)"
    />
  </div>
</template>
