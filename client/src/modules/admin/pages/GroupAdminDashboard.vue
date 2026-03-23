<script setup lang="ts">
import { markRaw, computed } from 'vue';
import { ArrowLeft, LayoutDashboard, CalendarDays, Megaphone, UsersRound, BookOpen, Settings } from 'lucide-vue-next';
import { useGroupAdmin } from '@/modules/admin/composables/useGroupAdmin';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

import GroupAdminOverview from '@/modules/admin/components/GroupAdminOverview.vue';
import GroupAdminMembers from '@/modules/admin/components/GroupAdminMembers.vue';
import GroupAdminTimetable from '@/modules/admin/components/GroupAdminTimetable.vue';
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
} = useGroupAdmin();

const { activeGroupOwnerId } = useAppAuth();
const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.tenantRole === 'admin');
const isOwner = computed(() => !!(userStore.user?.id && activeGroupOwnerId.value === userStore.user.id));

const tabs = [
  { id: 'overview', label: 'Übersicht', icon: markRaw(LayoutDashboard) },
  { id: 'members', label: 'Mitglieder', icon: markRaw(UsersRound) },
  { id: 'timetable', label: 'Stundenplan', icon: markRaw(CalendarDays) },
  { id: 'announcements', label: 'Ankündigungen', icon: markRaw(Megaphone) },
  { id: 'subjects', label: 'Fächer', icon: markRaw(BookOpen) },
  { id: 'settings', label: 'Einstellungen', icon: markRaw(Settings) },
];
</script>

<template>
  <div class="group-admin">
    <!-- Header Bar -->
    <header class="ga-header">
      <div class="ga-header-inner">
        <div class="ga-header-left">
          <router-link :to="`/groups/${groupId}/items/all`" class="ga-back">
            <ArrowLeft :size="18" />
          </router-link>
          <div class="ga-header-title">
            <h1>Verwaltung</h1>
            <span class="ga-group-name">{{ groupName }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <nav class="ga-tabs">
      <button
          v-for="tab in tabs"
          :key="tab.id"
          class="ga-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="16" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Content -->
    <main class="ga-content">
      <GroupAdminOverview
        v-if="activeTab === 'overview'"
        :stats="stats"
        :cleaning-up="cleaningUp"
        :editing-group-name="editingGroupName"
        :group-name="groupName"
        :new-group-name="newGroupName"
        :saving-group-name="savingGroupName"
        @cleanup="cleanupOldItems"
        @start-edit="startEditGroupName"
        @cancel-edit="cancelEditGroupName"
        @save-edit="saveGroupName"
        @update:newGroupName="newGroupName = $event"
      />

      <GroupAdminMembers
        v-if="activeTab === 'members'"
        :members="members"
        :loading="loadingMembers"
        :is-owner="isOwner"
        @refresh="loadMembers"
        @change-role="(userId, role) => changeRole(userId, role)"
        @remove="(userId, name) => removeMember(userId, name)"
      />

      <GroupAdminTimetable
        v-if="activeTab === 'timetable'"
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
    </main>
  </div>
</template>

<style scoped>
.group-admin {
  min-height: 100vh;
  background: var(--color-canvas);
  color: var(--color-on-surface);
}

.ga-header {
  border-bottom: 1px solid var(--color-canvas-border);
  background: var(--color-canvas);
  position: sticky;
  top: 0;
  z-index: 100;
}

.ga-header-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  align-items: center;
}

.ga-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ga-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  color: var(--color-sub);
  transition: background 0.15s, color 0.15s;
}

.ga-back:hover {
  background: var(--color-surface-hover);
  color: var(--color-on-surface);
}

.ga-header-title h1 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.ga-group-name {
  font-size: var(--text-sub);
  color: var(--color-sub);
  font-weight: 500;
}

.ga-tabs {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--color-canvas-border);
}

.ga-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: none;
  border: none;
  color: var(--color-sub);
  font-size: var(--text-body);
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s;
}

.ga-tab:hover { color: var(--color-on-surface); }

.ga-tab.active {
  color: var(--color-on-surface);
  border-bottom-color: var(--color-on-surface);
}

.ga-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 20px 64px;
}

@media (max-width: 640px) {
  .ga-content { padding: 20px 12px 48px; }
  .ga-tabs { overflow-x: auto; }
}
</style>
