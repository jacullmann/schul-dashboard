<script setup lang="ts">
import ScheduleLessonItem from './ScheduleLessonItem.vue';

defineProps<{
  group: any[];
  groupKey: string;
  isActive?: boolean;
  isCurrentDay?: boolean;
  isClickable?: boolean;
  selectedLessonId?: string;
  getDisplayName: (l: any) => string;
  getGroupStyle: (g: any[]) => any;
}>();

defineEmits<{
  (e: 'select-lesson', lesson: any): void;
}>();
</script>

<template>
  <div
    class="bg-surface rounded-md border border-surface-border flex flex-col overflow-hidden z-[2] transition-colors duration-300 shadow-input"
    :class="[
      isActive ? 'highlight-active bg-action !border-on-surface' : '',
      isCurrentDay && !isActive ? 'current-day bg-surface-hover border-surface-hover-border' : '',
      'min-[501px]:[grid-column:var(--col-desktop)]',
      'max-[500px]:![grid-column:var(--col-mobile)] max-[500px]:[scroll-snap-align:start] max-[500px]:[scroll-margin-left:0]'
    ]"
    :style="getGroupStyle(group)"
  >
    <ScheduleLessonItem
      v-for="(lesson, index) in group"
      :key="index"
      :lesson="lesson"
      :has-border="index < group.length - 1"
      :is-clickable="isClickable"
      :is-selected="selectedLessonId === lesson.id"
      :get-display-name="getDisplayName"
      @select="$emit('select-lesson', $event)"
    />
  </div>
</template>
