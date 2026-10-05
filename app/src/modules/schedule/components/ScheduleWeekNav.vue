<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ChevronLeft, ChevronRight } from '@lucide/vue';

defineProps<{
  /** The month the shown week falls in. */
  label: string;
}>();

const emit = defineEmits<{
  (e: 'shift', weeks: -1 | 1): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <span class="text-base font-semibold text-on-ghost" aria-live="polite">
      {{ label }}
    </span>
    <div class="flex items-center gap-1">
      <BaseButton
        :icon="ChevronLeft"
        :aria-label="t('schedule.previous_week')"
        @click="emit('shift', -1)"
      />
      <BaseButton
        :icon="ChevronRight"
        :aria-label="t('schedule.next_week')"
        @click="emit('shift', 1)"
      />
    </div>
  </div>
</template>
