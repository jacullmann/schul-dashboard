<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue';
import type { AdminAnnouncement } from '@/modules/admin/types';
import { useAnnouncementForm } from '@/core/composables/useAnnouncementForm';

defineProps<{
  announcements: AdminAnnouncement[];
}>();

const emit = defineEmits<{
  (e: 'delete', id: string): void;
  (e: 'refresh'): void;
}>();

const { openAnnouncementForm, onFormSuccess } = useAnnouncementForm();

// Refresh the list automatically after a successful creation
onFormSuccess(() => {
  emit('refresh');
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <div class="tab-panel">
    <PageHeader>
      Ankündigungen

      <template #action>
        <BaseButton variant="action" @click="openAnnouncementForm" :icon="Plus">
          Neue Ankündigung
        </BaseButton>
      </template>
    </PageHeader>

    <div v-if="announcements.length === 0" class="empty-hint">
      Keine Ankündigungen vorhanden.
    </div>
    <div v-else class="ann-list">
      <div
        v-for="ann in announcements"
        :key="ann.id"
        class="ann-item"
        :class="'ann-' + ann.color"
      >
        <div class="ann-item-body">{{ ann.content }}</div>
        <div class="ann-item-footer">
          <span class="ann-item-date">{{ formatDate(ann.createdAt) }}</span>
          <BaseButton
            variant="ghost"
            on="surface"
            @click="emit('delete', ann.id)"
            :icon="Trash2"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-panel {
  animation: fadeUp 0.2s ease;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ann-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ann-item {
  padding: 14px 16px;
  border-radius: 10px;
  border-left: 3px solid var(--color-canvas-border);
  background: var(--color-surface);
}

.ann-info {
  border-left-color: var(--color-action);
}
.ann-warn {
  border-left-color: var(--color-warn);
}
.ann-danger {
  border-left-color: var(--color-danger);
}

.ann-item-body {
  font-size: var(--text-body);
  line-height: 1.5;
  margin-bottom: 8px;
}

.ann-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ann-item-date {
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
}

.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--color-on-surface-muted);
  font-size: var(--text-body);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--color-on-surface-muted);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.btn-icon:hover {
  background: var(--color-surface-hover);
  color: var(--color-on-surface);
}
.btn-icon.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
