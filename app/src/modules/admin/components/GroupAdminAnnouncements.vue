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
        class="flex justify-between gap-2 p-1 rounded-xl bg-surface border border-surface-border border-l-[3px] animate-fade-up"
        :style="{
          animationDelay: `${index * 0.075}s`,
          animationFillMode: 'both',
        }"
        :class="[
          ann.color === 'info'
            ? 'border-l-action'
            : ann.color === 'warn'
              ? 'border-l-warn'
              : ann.color === 'danger'
                ? 'border-l-danger'
                : 'border-l-canvas-border',
        ]"
      >
        <div class="flex flex-col ml-3 my-1">
          <div class="text-base/relaxed text-on-ghost mb-2">{{ ann.content }}</div>
          <span class="text-sm/relaxed text-on-ghost-muted">{{
            formatDate(ann.createdAt)
          }}</span>
        </div>
        <BaseTooltip :content="t('global.buttons.delete')" placement="bottom">
          <BaseButton
            variant="ghost"
            size="sm"
            @click="emit('delete', ann.id)"
            :icon="Trash2"
          />
        </BaseTooltip>
      </div>
    </div>
  </div>
</template>
