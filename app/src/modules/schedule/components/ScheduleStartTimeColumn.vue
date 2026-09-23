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
      class="flex flex-col justify-center items-center bg-transparent text-sm text-on-ghost-muted h-full whitespace-nowrap min-[501px]:[grid-column:1] animate-fade-up"
      :class="{ 'min-h-[58px]': row.kind === 'lesson' }"
      :style="{ gridRow: row.gridRow }"
    >
      <span
        v-if="row.kind === 'lesson'"
        class="font-bold text-lg text-on-ghost"
      >
        {{ row.slot }}
      </span>
      <span class="text-xs">{{ row.startTime }}</span>
    </div>
  </div>
</template>
