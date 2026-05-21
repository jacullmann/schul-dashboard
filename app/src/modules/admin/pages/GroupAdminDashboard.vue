<script setup lang="ts">
import { markRaw, computed, ref } from 'vue';
import {
  LayoutDashboard,
  CalendarDays,
  Megaphone,
  UsersRound,
  UserRoundKey,
  BookOpen,
  Settings,
  ArrowLeft,
} from '@lucide/vue';
import { useGroupAdmin } from '@/modules/admin/composables/useGroupAdmin';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { type AdminNavItem } from '@/layouts/AdminLayout.vue';

import GroupAdminOverview from '@/modules/admin/components/GroupAdminOverview.vue';
import GroupAdminMembers from '@/modules/admin/components/GroupAdminMembers.vue';
import GroupAdminPermissions from '@/modules/admin/components/GroupAdminPermissions.vue';
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
  savingScheduleConfig,
  loadSubs,
  saveSub,
  deleteSub,
  updateScheduleConfig,
  lessons,
  loadingLessons,
  announcements,
  loadAnnouncements,
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
const isOwner = computed(
  () =>
    !!(userStore.user?.id && activeGroupOwnerId.value === userStore.user.id),
);

const navItems: AdminNavItem[] = [
  { id: 'overview', label: 'Overview', icon: markRaw(LayoutDashboard) },
  { id: 'members', label: 'Members', icon: markRaw(UsersRound) },
  { id: 'schedule', label: 'Schedule', icon: markRaw(CalendarDays) },
  { id: 'announcements', label: 'Announcements', icon: markRaw(Megaphone) },
  { id: 'subjects', label: 'Subjects', icon: markRaw(BookOpen) },
  { id: 'permissions', label: 'Permissions', icon: markRaw(UserRoundKey) },
  { id: 'settings', label: 'Settings', icon: markRaw(Settings) },
];

const transitionDirection = ref<'forward' | 'backward'>('forward');

const transitionName = computed(() =>
  transitionDirection.value === 'forward' ? 'slide-forward' : 'slide-backward',
);

const activeTabLabel = computed(() => {
  const item = navItems.find((n) => n.id === activeTab.value);
  return item ? item.label : '';
});

// Set activeTab to empty to show the list first, just like phone settings
activeTab.value = '';

function selectTab(id: string) {
  transitionDirection.value = 'forward';
  activeTab.value = id;
}

function goBack() {
  transitionDirection.value = 'backward';
  activeTab.value = '';
}

const itemStyles: Record<string, { bg: string }> = {
  overview: {
    bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-500/20',
  },
  members: {
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20',
  },
  schedule: {
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20',
  },
  announcements: {
    bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 dark:bg-purple-500/20',
  },
  subjects: {
    bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 dark:bg-sky-500/20',
  },
  permissions: {
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20',
  },
  settings: {
    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 dark:bg-slate-500/20',
  },
};
</script>

<template>
  <div class="phone-settings-container">
    <Transition :name="transitionName">
      <!-- ── MASTER PANE (Tabs List) ── -->
      <div v-if="!activeTab" class="settings-pane master-pane" key="master">
        <header class="settings-header">
          <div class="header-content">
            <h1 class="header-title">Verwaltung</h1>
            <p v-if="groupName" class="header-subtitle">{{ groupName }}</p>
          </div>
        </header>

        <div class="p-0 md:p-4">
          <div class="settings-group">
            <button
              v-for="item in navItems"
              :key="item.id"
              class="relative flex items-center justify-between w-full p-4 bg-transparent hover:bg-surface-hover cursor-pointer transition-hover outline-none text-left md:rounded-2xl"
              @click="selectTab(item.id)"
              v-ripple
            >
              <div class="flex items-center gap-4">
                <div class="flex size-10 justify-center items-center">
                  <component :is="item.icon" :size="24" />
                </div>
                <span class="text-on-ghost text-base font-medium">{{
                  item.label
                }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- ── DETAIL PANE (Active Tab Content) ── -->
      <div v-else class="settings-pane detail-pane" :key="activeTab">
        <header class="detail-header">
          <div
            class="header-left max-w-250 my-0 mx-auto flex items-center w-full gap-2"
          >
            <BaseButton
              variant="ghost"
              on="ghost"
              @click="goBack"
              v-ripple
              aria-label="Go Back"
              :icon="ArrowLeft"
            />
            <h2>{{ activeTabLabel }}</h2>
          </div>
        </header>

        <div class="detail-content scrollbar-hide">
          <div class="detail-inner">
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
              :saving-schedule-config="savingScheduleConfig"
              @refresh="loadSubs"
              @save-sub="saveSub"
              @delete-sub="deleteSub"
              @update-schedule-config="updateScheduleConfig"
            />

            <GroupAdminAnnouncements
              v-if="activeTab === 'announcements'"
              :announcements="announcements"
              @refresh="loadAnnouncements"
              @delete="deleteAnnouncement"
            />

            <GroupAdminSubjects
              v-if="activeTab === 'subjects'"
              :is-admin="isAdmin"
            />

            <GroupAdminPermissions
              v-if="activeTab === 'permissions'"
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
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.phone-settings-container {
  position: relative;
  width: 100%;
  height: calc(100vh - var(--header-height) - var(--announcement-height));
  overflow: hidden;
  background: var(--color-canvas);
  display: flex;
}

.settings-pane {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-canvas);
  overflow: hidden;
}

/* Master Pane Header */
.settings-header {
  padding: 32px 24px 20px;
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-canvas-border);
  flex-shrink: 0;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.header-title {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--color-on-ghost);
}

.header-subtitle {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-on-ghost-muted);
  margin-top: 6px;
}

/* Settings List */
.settings-list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 28px 24px;
}

.settings-group {
  max-width: 800px;
  margin: 0 auto;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
}

.badge {
  font-size: 0.8rem;
  font-weight: 700;
  background: var(--color-ghost-hover);
  color: var(--color-on-ghost-muted);
  padding: 2px 10px;
  border-radius: var(--radius-full);
}

/* Detail Pane Header */
.detail-header {
  height: 68px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-canvas-border);
  flex-shrink: 0;
}

/* Detail Content Area */
.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 24px;
  background: var(--color-canvas);
}

.detail-inner {
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

/* ─── TRANSITIONS ─── */

/* Forward (Master -> Detail) */
.slide-forward-enter-active,
.slide-forward-leave-active {
  transition:
    transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.45s ease;
}

.slide-forward-enter-from {
  transform: translateX(100%);
  z-index: 2;
}
.slide-forward-enter-to {
  transform: translateX(0);
  z-index: 2;
}

.slide-forward-leave-from {
  transform: translateX(0);
  opacity: 1;
  z-index: 1;
}
.slide-forward-leave-to {
  transform: translateX(-15%);
  opacity: 0.6;
  z-index: 1;
}

/* Backward (Detail -> Master) */
.slide-backward-enter-active,
.slide-backward-leave-active {
  transition:
    transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.45s ease;
}

.slide-backward-enter-from {
  transform: translateX(-15%);
  opacity: 0.6;
  z-index: 1;
}
.slide-backward-enter-to {
  transform: translateX(0);
  opacity: 1;
  z-index: 1;
}

.slide-backward-leave-from {
  transform: translateX(0);
  z-index: 2;
}
.slide-backward-leave-to {
  transform: translateX(100%);
  z-index: 2;
}

@media (max-width: 767px) {
  .settings-header {
    padding: 24px 16px 16px;
  }
  .settings-list-wrapper {
    padding: 0;
  }
  .detail-header {
    padding: 0 16px;
  }
  .detail-content {
    padding: 20px 16px;
  }
}
</style>
