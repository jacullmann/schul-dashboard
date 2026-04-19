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
  <div class="animate-fade-up">
    <PageHeader>
      Ankündigungen

      <template #action>
        <BaseButton variant="action" @click="openAnnouncementForm" :icon="Plus">
          Neue Ankündigung
        </BaseButton>
      </template>
    </PageHeader>

    <div
      v-if="announcements.length === 0"
      class="text-center p-8 text-on-surface-muted text-body"
    >
      Keine Ankündigungen vorhanden.
    </div>
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="ann in announcements"
        :key="ann.id"
        class="p-3.5 px-4 rounded-[10px] bg-surface border-l-[3px]"
        :class="[
          ann.color === 'info'
            ? 'border-action'
            : ann.color === 'warn'
              ? 'border-warn'
              : ann.color === 'danger'
                ? 'border-danger'
                : 'border-canvas-border',
        ]"
      >
        <div class="text-body leading-[1.5] mb-2">{{ ann.content }}</div>
        <div class="flex justify-between items-center">
          <span class="text-sub text-on-surface-muted">{{
            formatDate(ann.createdAt)
          }}</span>
          <BaseButton
            variant="ghost"
            on="surface"
            @click="emit('delete', ann.id)"
            :icon="Trash2"
            class="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-hover hover:text-on-surface transition-colors"
          />
        </div>
      </div>
    </div>
  </div>
</template>
