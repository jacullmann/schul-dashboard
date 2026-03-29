<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  timeSlots: Array<{ slot: number; time: string }>;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="max-[500px]:grid max-[500px]:grid-rows-[auto_repeat(9,auto)] max-[500px]:w-[85px] max-[500px]:shrink-0 max-[500px]:gap-2 max-[500px]:z-10 max-[500px]:bg-transparent min-[501px]:contents">
    <div class="bg-surface color-on-surface px-3 py-2 border border-surface-border text-center font-bold rounded-md text-body shadow-input max-[500px]:static min-[501px]:[grid-column:1] min-[501px]:[grid-row:1]">
      {{ t('school.tables.schedule.lesson') }}
    </div>
    
    <div
      v-for="ts in timeSlots"
      :key="ts.slot"
      class="flex flex-col justify-center items-center bg-transparent text-sub text-on-surface-muted whitespace-nowrap max-[500px]:static min-[501px]:[grid-column:1]"
      :style="{ gridRow: ts.slot + 1 }"
    >
      <span class="font-bold text-title text-on-surface">{{ ts.slot }}</span>
      <span class="text-footnote">{{ ts.time }}</span>
    </div>
  </div>
</template>
