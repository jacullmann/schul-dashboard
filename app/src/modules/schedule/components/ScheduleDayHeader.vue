<script setup lang="ts">
import { entranceDelay } from '@/modules/schedule/utils/entrance';

withDefaults(
  defineProps<{
    gridColumn: number;
    label: string;
    isCurrent?: boolean;
    isClickable?: boolean;
    animated?: boolean;
    /** A phone shows one day, so its header spans the time column and never dims. */
    standalone?: boolean;
  }>(),
  {
    isCurrent: false,
    isClickable: false,
    animated: true,
    standalone: false,
  },
);
</script>

<template>
  <div
    class="px-2 text-center font-bold text-base [grid-row:1]"
    :class="[
      isCurrent || standalone ? 'text-on-ghost' : 'text-on-ghost-muted',
      {
        'animate-enter': animated,
        'cursor-pointer select-none transition-colors hover:text-on-ghost':
          isClickable,
      },
    ]"
    :style="{
      gridColumn: standalone ? '1 / -1' : gridColumn,
      '--enter-delay': entranceDelay(gridColumn, 1),
    }"
  >
    {{ label }}
  </div>
</template>
