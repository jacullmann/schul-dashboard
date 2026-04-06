<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineEmits<{
  (e: 'select', lesson: any): void;
}>();

defineProps<{
  lesson: any;
  hasBorder: boolean;
  isClickable?: boolean;
  isSelected?: boolean;
  getDisplayName: (l: any) => string;
}>();

const { t } = useI18n();
</script>

<template>
  <div
    class="shrink-0 flex flex-col justify-center px-2 py-1"
    :class="[
      hasBorder
        ? 'border-b border-surface-border group-[.current-day]:border-surface-hover-border group-[.highlight-active]:border-on-surface-muted'
        : '',
      isClickable
        ? 'cursor-pointer transition-colors duration-150 hover:bg-surface-hover'
        : '',
      isSelected ? 'bg-action!' : '',
    ]"
    @click="isClickable ? $emit('select', lesson) : undefined"
  >
    <div v-if="lesson.cancelled">
      <div
        class="font-bold text-body text-on-surface whitespace-nowrap overflow-hidden text-ellipsis line-through text-on-surface-muted group-[.highlight-active]:text-on-action/70"
      >
        {{ getDisplayName(lesson) }}
      </div>
      <div
        class="text-danger font-bold text-body group-[.highlight-active]:text-danger"
      >
        {{ t('school.tables.schedule.cancelled') }}
      </div>
      <div
        class="flex justify-between text-sub text-on-surface-muted mt-0.5 group-[.highlight-active]:text-surface-hover"
      >
        <span class="line-through">{{ lesson.room }}</span>
      </div>
    </div>

    <div v-else>
      <div
        class="font-bold text-body whitespace-nowrap overflow-hidden text-ellipsis group-[.highlight-active]:text-on-action"
        :class="isSelected ? 'text-on-action' : 'text-on-surface'"
      >
        <template
          v-if="
            lesson._original &&
            getDisplayName(lesson) !== getDisplayName(lesson._original)
          "
        >
          <span
            class="line-through text-on-surface-muted mr-1 font-normal group-[.highlight-active]:text-surface-hover-border"
            :class="isSelected && 'text-surface-hover-border'"
          >
            {{ getDisplayName(lesson._original) }}
          </span>
          <span
            class="font-bold text-on-surface group-[.highlight-active]:text-on-action"
            :class="isSelected && 'text-on-action'"
          >
            {{ getDisplayName(lesson) }}
          </span>
        </template>
        <template v-else>
          {{ getDisplayName(lesson) }}
        </template>
      </div>

      <div
        class="flex justify-between text-sub mt-0.5 group-[.highlight-active]:text-surface-hover"
        :class="isSelected ? 'text-surface-hover' : 'text-on-surface-muted'"
      >
        <span class="inline-flex gap-1 items-center">
          <template
            v-if="lesson._original && lesson.room !== lesson._original.room"
          >
            <span
              class="line-through text-on-surface-muted mr-1 font-normal group-[.highlight-active]:text-surface-hover-border"
              :class="isSelected && 'text-surface-hover-border'"
            >
              {{ lesson._original.room }}
            </span>
            <span
              class="font-bold text-on-surface group-[.highlight-active]:text-on-action"
              :class="isSelected && 'text-on-action'"
            >
              {{ lesson.room }}
            </span>
          </template>
          <template v-else>
            {{ lesson.room || '-' }}
          </template>
        </span>
      </div>
    </div>
  </div>
</template>
