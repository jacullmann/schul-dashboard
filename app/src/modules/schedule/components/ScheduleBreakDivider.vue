<script setup lang="ts">
import { entranceDelay } from '@/modules/schedule/utils/entrance';

withDefaults(
  defineProps<{
    gridColumn: number;
    gridRow: number;
    label: string;
    animated?: boolean;
  }>(),
  {
    animated: true,
  },
);
</script>

<template>
  <div
    class="flex items-center gap-2 text-xs text-on-ghost-muted whitespace-nowrap"
    :class="{ 'animate-enter': animated }"
    :style="{
      gridColumn,
      gridRow,
      '--enter-delay': entranceDelay(gridColumn, gridRow),
    }"
  >
    <span class="h-px flex-1 bg-ghost-border" />
    {{ label }}
    <span class="h-px flex-1 bg-ghost-border" />
  </div>
</template>
