<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  lesson: any;
  hasBorder: boolean;
  getDisplayName: (l: any) => string;
}>();

const { t } = useI18n();
</script>

<template>
  <div 
    class="shrink-0 flex flex-col justify-center px-2 py-1"
    :class="{ 'border-b border-surface-border group-[.current-day]:border-surface-hover-border group-[.highlight-active]:border-on-surface-muted': hasBorder }"
  >
    <div v-if="lesson.cancelled">
      <div class="font-bold text-body text-on-surface whitespace-nowrap overflow-hidden text-ellipsis line-through text-on-surface-muted group-[.highlight-active]:text-on-action/70">
        {{ getDisplayName(lesson) }}
      </div>
      <div class="text-danger font-bold text-body group-[.highlight-active]:text-danger">
        {{ t('school.tables.schedule.cancelled') }}
      </div>
      <div class="flex justify-between text-sub text-on-surface-muted mt-0.5 group-[.highlight-active]:text-surface-hover">
        <span class="line-through">{{ lesson.room }}</span>
      </div>
    </div>

    <div v-else>
      <div class="font-bold text-body text-on-surface whitespace-nowrap overflow-hidden text-ellipsis group-[.highlight-active]:text-on-action">
        <span v-if="getDisplayName(lesson) !== getDisplayName(lesson._original!)" class="line-through text-on-surface-muted mr-1 font-normal group-[.highlight-active]:text-surface-hover-border">
          {{ getDisplayName(lesson._original!) }}
        </span>
        <span :class="{ 'font-bold text-on-surface group-[.highlight-active]:text-on-action': getDisplayName(lesson) !== getDisplayName(lesson._original!) }">
          {{ getDisplayName(lesson) }}
        </span>
      </div>

      <div class="flex justify-between text-sub text-on-surface-muted mt-0.5 group-[.highlight-active]:text-surface-hover">
        <span class="inline-flex gap-1 items-center">
          <span v-if="lesson.room !== lesson._original?.room" class="line-through text-on-surface-muted mr-1 font-normal group-[.highlight-active]:text-surface-hover-border">
             {{ lesson._original?.room }}
          </span>
          <span :class="{ 'font-bold text-on-surface group-[.highlight-active]:text-on-action': lesson.room !== lesson._original?.room }">
             {{ lesson.room }}
          </span>
        </span>
      </div>
    </div>
  </div>
</template>
