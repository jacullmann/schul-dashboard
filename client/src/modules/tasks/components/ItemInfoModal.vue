<script setup lang="ts">
import Modal from '@/common/components/Modal.vue';
import { Info } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import type { HwItem } from '@/modules/tasks/types';

const props = defineProps<{
  show: boolean;
  item: HwItem;
  isModOrAdmin: boolean;
  isSuperAdmin?: boolean;
}>();

defineEmits(['close']);

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
  <Modal v-if="show" @cancel="$emit('close')">
    <template #title>
      <Info :size="18" />
      {{ t('school.tasks.items.menu.infoModal.title') }}
    </template>

    <template #content>
      <dl class="info-list">
        <div class="info-row">
          <dt>{{ t('school.tasks.items.menu.infoModal.createdAt') }}</dt>
          <dd>{{ formatDate(item.createdAt) }}</dd>
        </div>

        <div class="info-row">
          <dt>{{ t('school.tasks.items.menu.infoModal.updatedAt') }}</dt>
          <dd>
            <span v-if="showUpdated">{{ formatDate(item.updatedAt) }}</span>
            <span v-else class="muted">{{ t('school.tasks.items.menu.infoModal.notEdited') }}</span>
          </dd>
        </div>

        <div v-if="isModOrAdmin" class="info-row">
          <dt>{{ t('school.tasks.items.menu.infoModal.createdBy') }}</dt>
          <dd>
            {{ item.createdByName || 'Unbekannt' }}
            <span v-if="isSuperAdmin && item.createdByEmail" class="muted email">
              ({{ item.createdByEmail }})
            </span>
          </dd>
        </div>
      </dl>
    </template>

    <template #actions>
      <button type="button" class="btn ghost" @click="$emit('close')">
        {{ t('global.buttons.close') }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.info-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 0;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

dt {
  font-size: var(--font-size-sub);
  color: var(--sub);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

dd {
  margin: 0;
  font-size: var(--font-size-body);
  color: var(--text-default);
  font-weight: 500;
}

.muted {
  color: var(--sub);
  font-weight: 400;
}

.email {
  font-size: var(--font-size-sub);
  margin-left: 2px;
}
</style>
