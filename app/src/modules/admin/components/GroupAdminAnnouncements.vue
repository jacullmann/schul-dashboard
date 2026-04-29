<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue';
import type { AdminAnnouncement } from '@/modules/admin/types';
import { useAnnouncementForm } from '@/core/composables/useAnnouncementForm';
import { useI18n } from 'vue-i18n';

defineProps<{
  announcements: AdminAnnouncement[];
}>();

const emit = defineEmits<{
  (e: 'delete', id: string): void;
  (e: 'refresh'): void;
}>();

const { t } = useI18n();

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
      class="text-center p-8 text-on-ghost-muted text-base"
    >
      Keine Ankündigungen vorhanden.
    </div>
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="(ann, index) in announcements"
        :key="ann.id"
        class="p-3.5 px-4 rounded-[10px] bg-surface border-l-[3px] animate-fade-up"
        :style="{ animationDelay: `${index * 0.075}s`, animationFillMode: 'both' }"
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
        <div class="text-base leading-[1.5] mb-2">{{ ann.content }}</div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-on-ghost-muted">{{
            formatDate(ann.createdAt)
          }}</span>
          <BaseTooltip :content="t('global.buttons.delete')" placement="bottom">
            <BaseButton
              variant="ghost"
              @click="emit('delete', ann.id)"
              :icon="Trash2"
            />
          </BaseTooltip>
        </div>
      </div>
    </div>
  </div>
</template>
