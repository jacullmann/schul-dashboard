<script setup lang="ts">
import { Plus } from '@lucide/vue';
import ScheduleLessonItem from './ScheduleLessonItem.vue';

withDefaults(
  defineProps<{
    group: any[];
    groupKey: string;
    isActive?: boolean;
    isCurrentDay?: boolean;
    isClickable?: boolean;
    hasContextMenu?: boolean;
    selectedLessonId?: string;
    selectedLessonIds?: string[];
    dayIndex?: number;
    elapsedLoadTime?: number;
    animated?: boolean;
    canAddLesson?: boolean;
    getDisplayName: (l: any) => string;
    getGroupStyle: (g: any[]) => any;
  }>(),
  {
    animated: true,
    hasContextMenu: false,
    canAddLesson: false,
    selectedLessonId: undefined,
    selectedLessonIds: () => [],
    dayIndex: undefined,
    elapsedLoadTime: 0,
  },
);

const emit = defineEmits<{
  (e: 'select-lesson', lesson: any, event?: MouseEvent): void;
  (e: 'contextmenu-lesson', lesson: any, event: UIEvent): void;
  (e: 'add-lesson'): void;
}>();
</script>

<template>
  <div
    class="group bg-surface rounded-md max-[500px]:rounded-lg border border-ghost-border flex flex-col overflow-hidden z-[2] shadow-input"
    :class="[
      animated ? 'animate-enter' : '',
      isActive
        ? 'highlight-active bg-action! border-action!'
        : isCurrentDay
          ? 'current-day min-[501px]:border-surface-hover-border min-[501px]:bg-linear-to-b min-[501px]:from-ghost-border min-[501px]:to-ghost-border'
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
      :has-context-menu="hasContextMenu"
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

    <!-- Courses of a year run in parallel, so a taken slot still takes more. -->
    <button
      v-if="canAddLesson"
      type="button"
      class="flex items-center justify-center gap-1 py-1 border-t border-dashed border-ghost-border text-on-ghost-muted hover:text-action hover:bg-action/5 transition-colors cursor-pointer"
      @click.stop="emit('add-lesson')"
    >
      <Plus :size="16" />
    </button>
  </div>
</template>
