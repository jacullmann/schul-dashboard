<script setup lang="ts">
import ScheduleLessonItem from './ScheduleLessonItem.vue';

defineProps<{
  group: any[];
  groupKey: string;
  isActive: boolean;
  isCurrentDay: boolean;
  getDisplayName: (l: any) => string;
  getGroupStyle: (g: any[]) => any;
}>();
</script>

<template>
  <div
    class="group bg-surface rounded-md border border-surface-border flex flex-col overflow-hidden z-[2] transition-colors duration-300 shadow-input"
    :class="{
      'highlight-active bg-action !border-on-surface': isActive,
      'current-day bg-surface-hover border-surface-hover-border': isCurrentDay && !isActive
    }"
    :style="getGroupStyle(group)"
  >
    <ScheduleLessonItem
      v-for="(lesson, index) in group"
      :key="index"
      :lesson="lesson"
      :has-border="index < group.length - 1"
      :get-display-name="getDisplayName"
    />
  </div>
</template>

<style scoped>
.group {
  grid-column: var(--col-desktop);
}
@media (max-width: 500px) {
  .group {
    grid-column: var(--col-mobile) !important;
    scroll-snap-align: start;
    scroll-margin-left: 0;
  }
}
</style>
