<script setup lang="ts">
import { markRaw, computed } from 'vue';
import { LayoutDashboard, CalendarDays, Megaphone, UsersRound, BookOpen, Settings } from '@lucide/vue';
import { useGroupAdmin } from '@/modules/admin/composables/useGroupAdmin';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import AdminLayout, { type AdminNavItem } from '@/modules/admin/components/AdminLayout.vue';

import GroupAdminOverview from '@/modules/admin/components/GroupAdminOverview.vue';
import GroupAdminMembers from '@/modules/admin/components/GroupAdminMembers.vue';
import GroupAdminSchedule from '@/modules/admin/components/GroupAdminSchedule.vue';
import GroupAdminAnnouncements from '@/modules/admin/components/GroupAdminAnnouncements.vue';
import GroupAdminSubjects from '@/modules/admin/components/GroupAdminSubjects.vue';
import GroupAdminSettings from '@/modules/admin/components/GroupAdminSettings.vue';

const {
  groupId,
  groupName,
  activeTab,
  stats,
  members,
  loadingMembers,
  loadMembers,
  changeRole,
  removeMember,
  bannedUsers,
  loadingBannedUsers,
  revertBan,
  subs,
  loadingSubs,
  savingSub,
  loadSubs,
  saveSub,
  deleteSub,
  lessons,
  loadingLessons,
  announcements,
  creatingAnn,
  createAnnouncement,
  deleteAnnouncement,
  cleaningUp,
  cleanupOldItems,
  editingGroupName,
  newGroupName,
  savingGroupName,
  startEditGroupName,
  cancelEditGroupName,
  saveGroupName,
  transferOwnership,
} = useGroupAdmin();

const { activeGroupOwnerId } = useAppAuth();
const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.tenantRole === 'admin');
const isOwner = computed(() => !!(userStore.user?.id && activeGroupOwnerId.value === userStore.user.id));

const navItems: AdminNavItem[] = [
  { id: 'overview',      label: 'Overview',     icon: markRaw(LayoutDashboard) },
  { id: 'members',       label: 'Members',        icon: markRaw(UsersRound) },
  { id: 'schedule',      label: 'Schedule',     icon: markRaw(CalendarDays) },
  { id: 'announcements', label: 'Announcements',icon: markRaw(Megaphone) },
  { id: 'subjects',      label: 'Subjects',     icon: markRaw(BookOpen) },
  { id: 'settings',      label: 'Settings',     icon: markRaw(Settings) },
];
</script>

<template>
  <AdminLayout
    title="Verwaltung"
    :subtitle="groupName"
    :back-to="`/groups/${groupId}/items/all`"
    :nav-items="navItems"
    :active-tab="activeTab"
    @update:active-tab="activeTab = $event"
  >
    <GroupAdminOverview
      v-if="activeTab === 'overview'"
      :stats="stats"
      :cleaning-up="cleaningUp"
      @cleanup="cleanupOldItems"
    />

    <GroupAdminMembers
      v-if="activeTab === 'members'"
      :members="members"
      :loading="loadingMembers"
      :banned-users="bannedUsers"
      :loading-banned="loadingBannedUsers"
      :is-owner="isOwner"
      @refresh="loadMembers"
      @change-role="(userId, role) => changeRole(userId, role)"
      @remove="(userId, name, ban) => removeMember(userId, name, ban)"
      @revert-ban="(userId) => revertBan(userId)"
      @transfer-ownership="transferOwnership"
    />

    <GroupAdminSchedule
      v-if="activeTab === 'schedule'"
      :subs="subs"
      :loading-subs="loadingSubs"
      :lessons="lessons"
      :loading-lessons="loadingLessons"
      :saving-sub="savingSub"
      @refresh="loadSubs"
      @save-sub="saveSub"
      @delete-sub="deleteSub"
    />

    <GroupAdminAnnouncements
      v-if="activeTab === 'announcements'"
      :announcements="announcements"
      :creating="creatingAnn"
      @create="(content, color) => createAnnouncement(content, color)"
      @delete="deleteAnnouncement"
    />

    <GroupAdminSubjects
      v-if="activeTab === 'subjects'"
      :is-admin="isAdmin"
    />

    <GroupAdminSettings
      v-if="activeTab === 'settings'"
      :is-admin="isAdmin"
      :is-owner="isOwner"
      :group-name="groupName"
      :new-group-name="newGroupName"
      :editing-group-name="editingGroupName"
      :saving-group-name="savingGroupName"
      @start-edit="startEditGroupName"
      @cancel-edit="cancelEditGroupName"
      @save-edit="saveGroupName"
      @update:newGroupName="newGroupName = $event"
    />
  </AdminLayout>
</template>
