<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { TimeSlot } from '@/modules/schedule/types';

withDefaults(
  defineProps<{
    timeSlots: TimeSlot[];
    animated?: boolean;
  }>(),
  {
    animated: true,
  },
);

const { t } = useI18n();
</script>

<template>
  <div
    class="bg-surface text-on-ghost px-3 py-2 border border-ghost-border text-center font-bold rounded-md text-base shadow-input [grid-column:1] [grid-row:1] flex items-center justify-center h-full"
    :class="{ 'animate-fade-up': animated }"
  >
    {{ t('schedule.lesson') }}
  </div>

  <div
    v-for="ts in timeSlots"
    :key="ts.slot"
    class="flex flex-col justify-center items-center bg-transparent text-sm text-on-ghost-muted h-full min-h-[58px] whitespace-nowrap [grid-column:1]"
    :class="{ 'animate-fade-up': animated }"
    :style="{ gridRow: ts.slot + 1 }"
  >
    <span class="font-bold text-lg text-on-ghost">{{ ts.slot }}</span>
    <span class="text-xs">{{ ts.time }}</span>
  </div>
</template>
