<script setup lang="ts">
import { computed } from 'vue';
import { entranceDelay } from '@/modules/schedule/utils/entrance';

const props = withDefaults(
  defineProps<{
    gridColumn: number;
    /** Date parts let the current day's date stand out from its weekday. */
    label: string | readonly Intl.DateTimeFormatPart[];
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

const labelParts = computed<readonly Intl.DateTimeFormatPart[]>(() =>
  typeof props.label === 'string'
    ? [{ type: 'literal', value: props.label }]
    : props.label,
);
</script>

<template>
  <div
    class="px-2 py-1 text-center font-medium text-base text-on-ghost [grid-row:1]"
    :class="[
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
    <span
      v-for="(part, index) in labelParts"
      :key="index"
      :class="{
        'font-bold text-accent': isCurrent && part.type === 'day',
      }"
      >{{ part.value }}</span
    >
  </div>
</template>
