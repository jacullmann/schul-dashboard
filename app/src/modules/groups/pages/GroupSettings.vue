<script setup lang="ts">
import { markRaw, computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
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
import { useGroupAdmin } from '@/modules/groups/composables/useGroupAdmin';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { type AdminNavItem } from '@/layouts/AdminLayout.vue';

import GroupSettingsOverview from '@/modules/groups/components/GroupSettingsOverview.vue';
import GroupSettingsMembers from '@/modules/groups/components/GroupSettingsMembers.vue';
import GroupSettingsMembersBanned from '@/modules/groups/components/GroupSettingsMembersBanned.vue';
import GroupSettingsMembersInvites from '@/modules/groups/components/GroupSettingsMembersInvites.vue';
import GroupSettingsPermissions from '@/modules/groups/components/GroupSettingsPermissions.vue';
import GroupSettingsSchedule from '@/modules/groups/components/GroupSettingsSchedule.vue';
import GroupSettingsAnnouncements from '@/modules/groups/components/GroupSettingsAnnouncements.vue';
import GroupSettingsSubjects from '@/modules/groups/components/GroupSettingsSubjects.vue';
import GroupSettingsGeneral from '@/modules/groups/components/GroupSettingsGeneral.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

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
  invites,
  loadingInvites,
  loadInvites,
  revokeInvite,
} = useGroupAdmin();

const activeTab = computed<string>({
  get() {
    return (route.params.tab as string) || '';
  },
  set(val) {
    if (val) {
      void router.push({
        name: 'group-admin',
        params: { groupId: groupId.value, tab: val },
      });
    } else {
      void router.push({
        name: 'group-admin',
        params: { groupId: groupId.value },
      });
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
  if (route.params.tab === 'subjects' && route.params.subTab) {
    return 'Subject info';
  }
  if (route.params.tab === 'members' && route.params.subTab === 'banned') {
    return t('groups.settings.members.ban_list.title');
  }
  if (route.params.tab === 'members' && route.params.subTab === 'invites') {
    return t('groups.settings.members.invite_links.title');
  }
  const item = navItems.find((n) => n.id === activeTab.value);
  return item ? item.label : '';
});

watch(
  () => ({
    tab: route.params.tab as string | undefined,
    subTab: route.params.subTab as string | undefined,
  }),
  (newVal, oldVal) => {
    if (newVal.tab !== oldVal?.tab) {
      if (newVal.tab && !oldVal?.tab) {
        transitionDirection.value = 'forward';
      } else if (!newVal.tab && oldVal?.tab) {
        transitionDirection.value = 'backward';
      }
    } else if (newVal.subTab !== oldVal?.subTab) {
      if (newVal.subTab && !oldVal?.subTab) {
        transitionDirection.value = 'forward';
      } else if (!newVal.subTab && oldVal?.subTab) {
        transitionDirection.value = 'backward';
      }
    }
  },
);

function selectTab(id: string) {
  transitionDirection.value = 'forward';
  activeTab.value = id;
}

function goBack() {
  transitionDirection.value = 'backward';
  if (route.params.subTab) {
    void router.push({
      name: 'group-admin',
      params: { groupId: groupId.value, tab: activeTab.value },
    });
  } else {
    activeTab.value = '';
  }
}
</script>

<template>
  <div class="phone-settings-container">
    <Transition :name="transitionName">
      <div v-if="!activeTab" key="master" class="settings-pane master-pane">
        <header
          class="p-4 pt-2 md:px-6 bg-canvas border-b border-ghost-border shrink-0"
        >
          <div class="w-full max-w-200 mx-auto">
            <h1>Gruppen Verwaltung</h1>
            <div
              v-if="groupName"
              class="text-on-ghost-muted font-semibold text-base"
            >
              {{ groupName }}
            </div>
          </div>
        </header>

        <div class="p-0 md:p-4">
          <div class="flex flex-col max-w-200 mx-auto">
            <BaseList
              v-for="(item, index) in navItems"
              :key="item.id"
              class="animate-fade-up"
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

      <div
        v-else
        :key="
          activeTab + (route.params.subTab ? '-' + route.params.subTab : '')
        "
        class="settings-pane detail-pane"
      >
        <header
          class="flex items-center py-4 md:py-6 h-16 bg-canvas border-b border-ghost-border shrink-0"
        >
          <div
            class="header-left max-w-250 my-0 mx-auto flex items-center w-full gap-2"
          >
            <BaseButton
              variant="ghost"
              on="ghost"
              aria-label="Go Back"
              :icon="ArrowLeft"
              @click="goBack"
            />
            <h2>{{ activeTabLabel }}</h2>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto p-4 md:py-8 px-6 bg-canvas">
          <div class="w-full max-w-250 mx-auto">
            <GroupSettingsOverview
              v-if="activeTab === 'overview'"
              :stats="stats"
              :cleaning-up="cleaningUp"
              @cleanup="cleanupOldItems"
            />

            <GroupSettingsMembers
              v-if="activeTab === 'members' && !route.params.subTab"
              :members="members"
              :loading="loadingMembers"
              :is-owner="isOwner"
              @refresh="loadMembers"
              @change-role="(userId, role) => changeRole(userId, role)"
              @remove="(userId, name, ban) => removeMember(userId, name, ban)"
              @transfer-ownership="transferOwnership"
            />

            <GroupSettingsMembersBanned
              v-else-if="
                activeTab === 'members' && route.params.subTab === 'banned'
              "
              :banned-users="bannedUsers"
              :loading="loadingBannedUsers"
              @revert-ban="revertBan"
            />

            <GroupSettingsMembersInvites
              v-else-if="
                activeTab === 'members' && route.params.subTab === 'invites'
              "
              :invites="invites"
              :loading="loadingInvites"
              @revoke-invite="revokeInvite"
              @refresh-invites="loadInvites"
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
              @update:new-group-name="newGroupName = $event"
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
</style>
