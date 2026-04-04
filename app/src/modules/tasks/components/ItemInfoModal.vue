<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import type { HwItem } from '@/modules/tasks/types';

const props = defineProps<{
  show: boolean;
  item: HwItem;
  isModOrAdmin: boolean;
  isSuperAdmin?: boolean;
}>();

defineEmits(['cancel']);

const { t, locale } = useI18n();

function formatDate(iso: string | undefined): string {
  if (!iso) return t('school.tasks.items.menu.infoModal.notEdited');
  return new Date(iso).toLocaleString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Only show "last edited" if it differs meaningfully from created (> 30 seconds)
const showUpdated = computed(() => {
  if (!props.item.createdAt || !props.item.updatedAt) return false;
  const diff = Math.abs(
    new Date(props.item.updatedAt).getTime() - new Date(props.item.createdAt).getTime()
  );
  return diff > 30_000;
});
</script>

<template>
  <BaseModal v-if="show" @cancel="$emit('cancel')">
    <template #title>
      {{ t('school.tasks.items.menu.infoModal.title') }}
    </template>

    <template #content>
      <dl class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <dt>{{ t('school.tasks.items.menu.infoModal.createdAt') }}</dt>
          <dd>{{ formatDate(item.createdAt) }}</dd>
        </div>

        <div class="flex flex-col gap-2">
          <dt>{{ t('school.tasks.items.menu.infoModal.updatedAt') }}</dt>
          <dd>
            <span v-if="showUpdated">{{ formatDate(item.updatedAt) }}</span>
            <span v-else class="text-on-surface-muted">{{ t('school.tasks.items.menu.infoModal.notEdited') }}</span>
          </dd>
        </div>

        <div v-if="isModOrAdmin" class="flex flex-col gap-2">
          <dt>{{ t('school.tasks.items.menu.infoModal.createdBy') }}</dt>
          <dd>
            {{ item.createdByName || 'Unbekannt' }}
            <span v-if="isSuperAdmin && item.createdByEmail" class="text-on-surface-muted text-sub ml-0.5">
              ({{ item.createdByEmail }})
            </span>
          </dd>
        </div>
      </dl>
    </template>
  </BaseModal>
</template>

<style scoped>
dt {
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  font-weight: 500;
}

dd {
  margin: 0;
  font-size: var(--text-body);
  color: var(--color-on-surface);
  font-weight: 500;
}
</style>
