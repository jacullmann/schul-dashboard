<script setup lang="ts">
import { useI18n } from 'vue-i18n';

withDefaults(
  defineProps<{
    gridColumn: number;
    gridRow: number;
    durationMins: number;
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
    class="flex items-center gap-2 text-xs text-on-ghost-muted whitespace-nowrap"
    :class="{ 'animate-fade-up': animated }"
    :style="{ gridColumn, gridRow }"
  >
    <span class="h-px flex-1 bg-ghost-border" />
    {{ t('schedule.break', { minutes: durationMins }) }}
    <span class="h-px flex-1 bg-ghost-border" />
  </div>
</template>
