<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue';
import { useAnnouncementFormModal } from '@/stores/modalStore';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useGroupPageId } from '@/core/composables/useGroupPageId';
import { useGroupAnnouncementsAdmin } from '@/modules/groups/composables/useGroupAnnouncementsAdmin';
import AnnouncementList from '@/modules/announcements/components/AnnouncementList.vue';
import { fromGroupAnnouncement } from '@/modules/announcements/composables/useAnnouncementFeed';

const groupId = useGroupPageId();
const { announcements, loadAnnouncements, deleteAnnouncement } =
  useGroupAnnouncementsAdmin();
const listedAnnouncements = computed(() =>
  announcements.value.map(fromGroupAnnouncement),
);

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

    <AnnouncementList :announcements="listedAnnouncements">
      <template #actions="{ announcement }">
        <BaseTooltip
          v-if="canManageAnnouncements"
          :content="t('common.buttons.delete')"
          placement="bottom"
        >
          <BaseButton
            variant="ghost"
            size="sm"
            :icon="Trash2"
            @click="deleteAnnouncement(announcement.id)"
          />
        </BaseTooltip>
      </template>
    </AnnouncementList>
  </div>
</template>
