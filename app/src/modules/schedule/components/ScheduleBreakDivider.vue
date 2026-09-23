<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  col: number;
  gridRow: number;
  durationMins: number;
}>();

const { t } = useI18n();
</script>

<template>
  <div
    class="flex items-center gap-2 text-xs text-on-ghost-muted whitespace-nowrap min-[501px]:[grid-column:var(--col-desktop)] max-[500px]:![grid-column:var(--col-mobile)] animate-fade-up"
    :style="{
      '--col-desktop': `${col + 1} / span 1`,
      '--col-mobile': `${col} / span 1`,
      gridRow: `${gridRow} / span 1`,
    }"
  >
    <span class="h-px flex-1 bg-ghost-border" />
    {{ t('schedule.break', { minutes: durationMins }) }}
    <span class="h-px flex-1 bg-ghost-border" />
  </div>
</template>
