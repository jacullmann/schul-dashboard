<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue';
import type {
  Announcement,
  AnnouncementColor,
} from '@/modules/announcements/types';
import { useAnnouncementForm } from '@/core/composables/useAnnouncementForm';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

defineProps<{
  groupId: string;
  announcements: Announcement[];
}>();

const emit = defineEmits<{
  (e: 'delete', id: string): void;
  (e: 'refresh'): void;
}>();

const ACCENT_COLOR: Record<AnnouncementColor, string> = {
  info: 'bg-action',
  warn: 'bg-warn',
  danger: 'bg-danger',
};

const { t } = useI18n();

const { openAnnouncementForm, onFormSuccess } = useAnnouncementForm();

const { checkPermission } = useAppAuth();
const canManageAnnouncements = computed(() =>
  checkPermission('manage_announcements'),
);

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
  <div>
    <PageHeader>
      {{ t('announcements.list.title') }}

      <template #action>
        <BaseTooltip
          v-if="canManageAnnouncements"
          :content="t('announcements.list.create_button')"
          placement="bottom"
        >
          <BaseButton
            variant="action"
            :icon="Plus"
            icon-classes="size-6"
            @click="openAnnouncementForm(groupId, { local: true })"
          />
        </BaseTooltip>
      </template>
    </PageHeader>

    <div
      v-if="announcements.length === 0"
      class="text-center p-8 text-on-ghost-muted text-base"
    >
      {{ t('announcements.list.empty_state') }}
    </div>
    <ul v-else class="flex flex-col">
      <template v-for="(ann, index) in announcements" :key="ann.id">
        <li
          v-if="index > 0"
          role="presentation"
          class="task-separator border-b border-ghost-border ml-4"
        ></li>
        <li class="flex gap-3 py-2">
          <span
            class="w-1 shrink-0 my-1 rounded-full"
            :class="ACCENT_COLOR[ann.color]"
          ></span>
          <div class="flex flex-col flex-1 min-w-0 gap-1">
            <div class="text-base text-on-ghost break-words">
              {{ ann.content }}
            </div>
            <div class="flex justify-between items-center gap-2">
              <time
                :datetime="ann.createdAt"
                class="text-sm text-on-ghost-muted"
                >{{ formatDate(ann.createdAt) }}</time
              >
              <BaseTooltip
                v-if="canManageAnnouncements"
                :content="t('common.buttons.delete')"
                placement="bottom"
              >
                <BaseButton
                  variant="ghost"
                  size="sm"
                  :icon="Trash2"
                  @click="emit('delete', ann.id)"
                />
              </BaseTooltip>
            </div>
          </div>
        </li>
      </template>
    </ul>
  </div>
</template>
