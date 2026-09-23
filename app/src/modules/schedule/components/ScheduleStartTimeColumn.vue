<script setup lang="ts">
import { useWindowSize } from '@vueuse/core';
import type { ScheduleRow } from '@/modules/schedule/types';

const { width: windowWidth } = useWindowSize();

defineProps<{
  rows: ScheduleRow[];
  fallbackGridTemplateRows: string;
  gridTemplateRows?: string;
}>();
</script>

<template>
  <div
    class="max-[500px]:grid max-[500px]:w-13 max-[500px]:shrink-0 max-[500px]:gap-2 max-[500px]:z-10 max-[500px]:bg-transparent min-[501px]:contents"
    :style="
      windowWidth < 501
        ? { gridTemplateRows: gridTemplateRows || fallbackGridTemplateRows }
        : {}
    "
  >
    <div
      v-for="row in rows"
      :key="row.gridRow"
      class="flex items-center justify-center h-full whitespace-nowrap min-[501px]:[grid-column:1] animate-fade-up"
      :class="
        row.kind === 'lesson'
          ? 'min-h-[58px] text-sm font-semibold text-on-ghost'
          : 'text-xs text-on-ghost-muted'
      "
      :style="{ gridRow: row.gridRow }"
    >
      {{ row.startTime }}
    </div>
  </div>
</template>
