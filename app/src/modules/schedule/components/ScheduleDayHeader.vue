<script setup lang="ts">
import { entranceDelay } from '@/modules/schedule/utils/entrance';

withDefaults(
  defineProps<{
    gridColumn: number;
    label: string;
    isCurrent?: boolean;
    isClickable?: boolean;
    animated?: boolean;
  }>(),
  {
    isCurrent: false,
    isClickable: false,
    animated: true,
  },
);
</script>

<template>
  <div
    class="px-2 text-center font-bold text-base [grid-row:1]"
    :class="[
      isCurrent ? 'text-on-ghost' : 'text-on-ghost-muted',
      {
        'animate-enter': animated,
        'cursor-pointer select-none transition-colors hover:text-on-ghost':
          isClickable,
      },
    ]"
    :style="{ gridColumn, '--enter-delay': entranceDelay(gridColumn, 1) }"
  >
    {{ label }}
  </div>
</template>
