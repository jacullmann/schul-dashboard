<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ChevronLeft, ChevronRight } from '@lucide/vue';

const props = defineProps<{
  page: number;
  pageCount: number;
  total: number;
}>();

const emit = defineEmits<{
  (e: 'update:page', page: number): void;
}>();

const { t } = useI18n();
</script>

<template>
  <BaseRow justify="between" class="mt-3 text-sm text-on-ghost-muted">
    <span>{{ t('admin.pagination.total', { count: props.total }) }}</span>
    <BaseRow v-if="props.pageCount > 1" class="gap-1">
      <BaseButton
        size="sm"
        :icon="ChevronLeft"
        :disabled="props.page <= 1"
        :aria-label="t('admin.pagination.previous')"
        @click="emit('update:page', props.page - 1)"
      />
      <span class="tabular-nums">
        {{
          t('admin.pagination.page', {
            page: props.page,
            count: props.pageCount,
          })
        }}
      </span>
      <BaseButton
        size="sm"
        :icon="ChevronRight"
        :disabled="props.page >= props.pageCount"
        :aria-label="t('admin.pagination.next')"
        @click="emit('update:page', props.page + 1)"
      />
    </BaseRow>
  </BaseRow>
</template>
