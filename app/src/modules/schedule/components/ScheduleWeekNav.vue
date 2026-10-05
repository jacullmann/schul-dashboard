<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ChevronLeft, ChevronRight } from '@lucide/vue';

defineProps<{
  /** The month(s) the shown week falls in, split so the year can be styled apart. */
  label: Intl.DateTimeRangeFormatPart[];
}>();

const emit = defineEmits<{
  (e: 'shift', weeks: -1 | 1): void;
  (e: 'today'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <BaseRow>
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

      <span class="text-xl text-on-ghost" aria-live="polite">
        <span
          v-for="(part, index) in label"
          :key="index"
          :class="part.type === 'year' ? 'font-normal' : 'font-bold'"
          >{{ part.value }}</span
        >
      </span>
    </BaseRow>

    <BaseButton @click="emit('today')">
      {{ t('schedule.today') }}
    </BaseButton>
  </div>
</template>
