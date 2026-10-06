<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { entranceDelay } from '@/modules/schedule/utils/entrance';

withDefaults(
  defineProps<{
    gridColumn: number;
    firstRow: number;
    lastRow: number;
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
    class="flex items-center justify-center text-sm font-bold text-on-ghost-muted"
    :class="{ 'animate-enter': animated }"
    :style="{
      gridColumn,
      gridRow: `${firstRow} / ${lastRow + 1}`,
      '--enter-delay': entranceDelay(gridColumn, firstRow),
    }"
  >
    {{ t('schedule.free') }}
  </div>
</template>
