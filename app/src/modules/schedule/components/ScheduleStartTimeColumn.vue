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

<!--
  A row joined to the previous one reaches back over the grid's row gap and
  into the previous row, so its track shrinks and the cell spanning both rows
  ends up shorter than two separate lessons.
-->
<template>
  <div
    v-for="row in rows"
    :key="row.gridRow"
    class="flex flex-col justify-center items-center bg-transparent text-sm text-on-ghost-muted h-full whitespace-nowrap [grid-column:1]"
    :class="{
      'min-h-14.5': row.kind === 'lesson',
      '-mt-4': row.kind === 'lesson' && row.joinsPrevious,
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
    <span class="text-xs tabular-nums">{{ row.startTime }}</span>
  </div>
</template>
