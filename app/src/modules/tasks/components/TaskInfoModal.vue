<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import type { HwItem } from '@/modules/tasks/types';

const props = defineProps<{
  open: boolean;
  item: HwItem | null;
  isModOrAdmin: boolean;
  isSuperAdmin?: boolean;
}>();

defineEmits(['cancel']);

const { t, locale } = useI18n();

function formatDate(iso: string | undefined): string {
  if (!iso) return t('tasks.list.tasks.menu.info_modal.not_edited');
  return new Date(iso).toLocaleString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const showUpdated = computed(() => {
  if (!props.item?.createdAt || !props.item?.updatedAt) return false;
  const diff = Math.abs(
    new Date(props.item.updatedAt).getTime() -
      new Date(props.item.createdAt).getTime(),
  );
  return diff > 30_000;
});
</script>

<template>
  <BaseModal :open="open" :sheet="true" @cancel="$emit('cancel')">
    <template #title>
      {{ t('tasks.list.tasks.menu.info_modal.title') }}
    </template>

    <template #content>
      <dl class="flex flex-col gap-4">
        <div>
          <dt class="text-sm text-on-ghost-muted font-normal">
            {{ t('tasks.list.tasks.menu.info_modal.created_at') }}
          </dt>
          <dd class="text-base text-on-ghost font-medium">
            {{ formatDate(item?.createdAt) }}
          </dd>
        </div>

        <div>
          <dt class="text-sm text-on-ghost-muted font-normal">
            {{ t('tasks.list.tasks.menu.info_modal.updated_at') }}
          </dt>
          <dd class="text-base text-on-ghost font-medium">
            <span v-if="showUpdated">{{ formatDate(item?.updatedAt) }}</span>
            <span v-else class="text-on-ghost-muted">{{
              t('tasks.list.tasks.menu.info_modal.not_edited')
            }}</span>
          </dd>
        </div>

        <div>
          <dt class="text-sm text-on-ghost-muted font-medium">
            {{ t('tasks.list.tasks.menu.info_modal.created_by') }}
          </dt>
          <dd class="text-base text-on-ghost font-medium">
            {{ item?.createdByName || 'Unbekannt' }}
            <span
              v-if="isSuperAdmin && item?.createdByEmail"
              class="text-on-ghost-muted text-sm ml-0.5"
            >
              ({{ item?.createdByEmail }})
            </span>
          </dd>
        </div>
      </dl>
    </template>
  </BaseModal>
</template>
