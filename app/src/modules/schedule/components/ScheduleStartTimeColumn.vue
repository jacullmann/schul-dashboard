<script setup lang="ts">
import type { ScheduleRow } from '@/modules/schedule/types';
import { entranceDelay } from '@/modules/schedule/utils/entrance';

withDefaults(
  defineProps<{
    rows: ScheduleRow[];
    /** Rows left out keep their space but show no label. */
    labelledRows?: ReadonlySet<number>;
    animated?: boolean;
  }>(),
  {
    animated: true,
  },
);
</script>

<template>
  <div
    v-for="row in rows"
    :key="row.gridRow"
    class="flex flex-col justify-center items-center bg-transparent text-sm text-on-ghost-muted h-full whitespace-nowrap [grid-column:1]"
    :class="{
      'min-h-[58px]': row.kind === 'lesson',
      'animate-enter': animated,
      invisible: labelledRows && !labelledRows.has(row.gridRow),
    }"
    :style="{
      gridRow: row.gridRow,
      '--enter-delay': entranceDelay(1, row.gridRow),
    }"
  >
    <span v-if="row.kind === 'lesson'" class="font-bold text-lg text-on-ghost">
      {{ row.slot }}
    </span>
    <span class="text-xs">{{ row.startTime }}</span>
  </div>
</template>
