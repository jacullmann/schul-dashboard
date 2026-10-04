<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue';
import type { AnnouncementColor } from '@/modules/announcements/types';
import { useAnnouncementFormModal } from '@/stores/modalStore';
import { useI18n } from 'vue-i18n';
import { formatDate } from '@/utils/date-formatter';
import { computed } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useGroupPageId } from '@/core/composables/useGroupPageId';
import { useGroupAnnouncementsAdmin } from '@/modules/groups/composables/useGroupAnnouncementsAdmin';

const groupId = useGroupPageId();
const { announcements, loadAnnouncements, deleteAnnouncement } =
  useGroupAnnouncementsAdmin();

const ACCENT_COLOR: Record<AnnouncementColor, string> = {
  info: 'bg-action',
  warn: 'bg-warn',
  danger: 'bg-danger',
};

const { t } = useI18n();

const announcementFormModal = useAnnouncementFormModal();

const { checkPermission } = useAppAuth();
const canManageAnnouncements = computed(() =>
  checkPermission('manage_announcements'),
);

announcementFormModal.onSuccess(() => void loadAnnouncements());
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
            @click="announcementFormModal.openFor(groupId, { local: true })"
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
                >{{ formatDate(ann.createdAt, t) }}</time
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
                  @click="deleteAnnouncement(ann.id)"
                />
              </BaseTooltip>
            </div>
          </div>
        </li>
      </template>
    </ul>
  </div>
</template>
