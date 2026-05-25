<script setup lang="ts">
import { markRaw, computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  // LayoutDashboard,
  CalendarDays,
  Megaphone,
  UsersRound,
  Key,
  BookOpen,
  SlidersHorizontal,
  ArrowLeft,
} from '@lucide/vue';
import { useGroupAdmin } from '@/modules/admin/composables/useGroupAdmin';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { type AdminNavItem } from '@/layouts/AdminLayout.vue';

import GroupSettingsOverview from '@/modules/admin/components/GroupSettingsOverview.vue';
import GroupSettingsMembers from '@/modules/admin/components/GroupSettingsMembers.vue';
import GroupSettingsPermissions from '@/modules/admin/components/GroupSettingsPermissions.vue';
import GroupSettingsSchedule from '@/modules/admin/components/GroupSettingsSchedule.vue';
import GroupSettingsAnnouncements from '@/modules/admin/components/GroupSettingsAnnouncements.vue';
import GroupSettingsSubjects from '@/modules/admin/components/GroupSettingsSubjects.vue';
import GroupSettingsGeneral from '@/modules/admin/components/GroupSettingsGeneral.vue';

const route = useRoute();
const router = useRouter();

const {
  groupId,
  groupName,
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

const activeTab = computed<string>({
  get() {
    return (route.params.tab as string) || '';
  },
  set(val) {
    if (val) {
      void router.push(`/groups/${groupId.value}/settings/${val}`);
    } else {
      void router.push(`/groups/${groupId.value}/settings`);
    }
  },
});

const { activeGroupOwnerId } = useAppAuth();
const userStore = useUserStore();
const isAdmin = computed(
  () =>
    userStore.user?.tenantRole === 'admin' ||
    userStore.user?.role === 'superadmin',
);
const isOwner = computed(
  () =>
    !!(userStore.user?.id && activeGroupOwnerId.value === userStore.user.id),
);

const navItems: AdminNavItem[] = [
  /* {
    id: 'overview',
    label: 'Overview',
    icon: markRaw(LayoutDashboard),
    description: 'Activity • Status • Quick actions',
  }, */
  {
    id: 'general',
    label: 'General',
    icon: markRaw(SlidersHorizontal),
    description: 'Appearance • Password • Deletion',
  },
  {
    id: 'members',
    label: 'Members',
    icon: markRaw(UsersRound),
    description: 'Roles • Bans • Ownership',
  },
  {
    id: 'permissions',
    label: 'Permissions',
    icon: markRaw(Key),
    description: 'Permissions • Roles • Security',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: markRaw(CalendarDays),
    description: 'Lessons • Schedule changes',
  },
  {
    id: 'subjects',
    label: 'Subjects',
    icon: markRaw(BookOpen),
    description: 'Subjects • Courses',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: markRaw(Megaphone),
    description: 'Manage Announcements',
  },
];

const transitionDirection = ref<'forward' | 'backward'>('forward');

const transitionName = computed(() =>
  transitionDirection.value === 'forward' ? 'slide-forward' : 'slide-backward',
);

const activeTabLabel = computed(() => {
  const item = navItems.find((n) => n.id === activeTab.value);
  return item ? item.label : '';
});

watch(
  () => route.params.tab,
  (newTab, oldTab) => {
    if (newTab && !oldTab) {
      transitionDirection.value = 'forward';
    } else if (!newTab && oldTab) {
      transitionDirection.value = 'backward';
    }
  },
);

function selectTab(id: string) {
  transitionDirection.value = 'forward';
  activeTab.value = id;
}

function goBack() {
  transitionDirection.value = 'backward';
  activeTab.value = '';
}
</script>

<template>
  <div class="phone-settings-container">
    <Transition :name="transitionName">
      <div v-if="!activeTab" class="settings-pane master-pane" key="master">
        <header class="settings-header">
          <div class="header-content">
            <h1 class="header-title">Gruppen Verwaltung</h1>
            <p v-if="groupName" class="header-subtitle">{{ groupName }}</p>
          </div>
        </header>

        <div class="p-0 md:p-4">
          <div class="settings-group">
            <BaseList
              v-for="(item, index) in navItems"
              :key="item.id"
              class="animate-fade-up"
              :style="{
                animationDelay: `${index * 0.075}s`,
                animationFillMode: 'both',
              }"
              :separator="index !== navItems.length - 1"
              :chevron="true"
              @click="selectTab(item.id)"
            >
              <template #icon>
                <span class="flex size-10 justify-center items-center">
                  <component :is="item.icon" :size="24" />
                </span>
              </template>
              <template #label>
                <span class="flex flex-col min-h-10 justify-between">
                  <span class="text-on-ghost text-base/tight font-medium">{{
                    item.label
                  }}</span>
                  <span class="text-on-ghost-muted text-xs/tight font-normal">{{
                    item.description
                  }}</span>
                </span>
              </template>
            </BaseList>
          </div>
        </div>
      </div>

      <div v-else class="settings-pane detail-pane" :key="activeTab">
        <header class="detail-header">
          <div
            class="header-left max-w-250 my-0 mx-auto flex items-center w-full gap-2"
          >
            <BaseButton
              variant="ghost"
              on="ghost"
              @click="goBack"
              aria-label="Go Back"
              :icon="ArrowLeft"
            />
            <h2>{{ activeTabLabel }}</h2>
          </div>
        </header>

        <div class="detail-content scrollbar-hide">
          <div class="detail-inner">
            <GroupSettingsOverview
              v-if="activeTab === 'overview'"
              :stats="stats"
              :cleaning-up="cleaningUp"
              @cleanup="cleanupOldItems"
            />

            <GroupSettingsMembers
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

            <GroupSettingsSchedule
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

            <GroupSettingsAnnouncements
              v-if="activeTab === 'announcements'"
              :announcements="announcements"
              @refresh="loadAnnouncements"
              @delete="deleteAnnouncement"
            />

            <GroupSettingsSubjects
              v-if="activeTab === 'subjects'"
              :is-admin="isAdmin"
            />

            <GroupSettingsPermissions
              v-if="activeTab === 'permissions'"
              :is-admin="isAdmin"
            />

            <GroupSettingsGeneral
              v-if="activeTab === 'general'"
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
.settings-group {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.detail-header {
  height: 68px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-canvas-border);
  flex-shrink: 0;
}

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
