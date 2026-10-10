<script setup lang="ts">
import { markRaw, computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  CalendarDays,
  Megaphone,
  UsersRound,
  Key,
  BookOpen,
  SlidersHorizontal,
  ArrowLeft,
  GraduationCap,
} from '@lucide/vue';
import { useGroupPageId } from '@/core/composables/useGroupPageId';
import { useGroupSettingsAccess } from '@/modules/groups/composables/useGroupSettingsAccess';
import { useReturnRoute } from '@/common/composables/useReturnRoute';
import { type AdminNavItem } from '@/layouts/AdminLayout.vue';

import GroupSettingsMembers from '@/modules/groups/components/GroupSettingsMembers.vue';
import GroupSettingsMembersBanned from '@/modules/groups/components/GroupSettingsMembersBanned.vue';
import GroupSettingsMembersInvites from '@/modules/groups/components/GroupSettingsMembersInvites.vue';
import GroupSettingsPermissions from '@/modules/groups/components/GroupSettingsPermissions.vue';
import GroupSettingsSchedule from '@/modules/groups/components/GroupSettingsSchedule.vue';
import GroupSettingsAnnouncements from '@/modules/groups/components/GroupSettingsAnnouncements.vue';
import GroupSettingsSubjects from '@/modules/groups/components/GroupSettingsSubjects.vue';
import GroupSettingsGeneral from '@/modules/groups/components/GroupSettingsGeneral.vue';
import GroupSettingsMyCourses from '@/modules/groups/components/GroupSettingsMyCourses.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const groupId = useGroupPageId();

// Returning to a settings page would bounce between the two pages' back buttons.
const { leave: leaveSettings } = useReturnRoute(
  () => ({
    name: 'group-dashboard',
    params: { groupId },
  }),
  ['group-admin', 'account-settings'],
);

const activeTab = computed<string>({
  get() {
    return (route.params.tab as string) || '';
  },
  set(val) {
    if (val) {
      void router.push({
        name: 'group-admin',
        params: { groupId, tab: val },
      });
    } else {
      void router.push({
        name: 'group-admin',
        params: { groupId },
      });
    }
  },
});

const { hasOwnerRights } = useGroupSettingsAccess();

const navItems = computed<AdminNavItem[]>(() => [
  {
    id: 'courses',
    label: t('groups.settings.nav.courses'),
    icon: markRaw(GraduationCap),
  },
  {
    id: 'general',
    label: t('groups.settings.nav.general'),
    icon: markRaw(SlidersHorizontal),
  },
  {
    id: 'members',
    label: t('groups.settings.nav.members'),
    icon: markRaw(UsersRound),
  },
  {
    id: 'permissions',
    label: t('groups.settings.nav.permissions'),
    icon: markRaw(Key),
  },
  {
    id: 'schedule',
    label: t('groups.settings.nav.schedule'),
    icon: markRaw(CalendarDays),
  },
  {
    id: 'subjects',
    label: t('groups.settings.nav.subjects'),
    icon: markRaw(BookOpen),
  },
  {
    id: 'announcements',
    label: t('groups.settings.nav.announcements'),
    icon: markRaw(Megaphone),
  },
]);

const transitionDirection = ref<'forward' | 'backward'>('forward');

const transitionName = computed(() =>
  transitionDirection.value === 'forward' ? 'slide-forward' : 'slide-backward',
);

const activeTabLabel = computed(() => {
  if (route.params.tab === 'subjects' && route.params.subTab) {
    return t('groups.settings.nav.subject_info');
  }
  if (route.params.tab === 'members' && route.params.subTab === 'banned') {
    return t('groups.settings.members.ban_list.title');
  }
  if (route.params.tab === 'members' && route.params.subTab === 'invites') {
    return t('groups.settings.members.invite_links.title');
  }
  const item = navItems.value.find((n) => n.id === activeTab.value);
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
      params: { groupId, tab: activeTab.value },
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
          class="px-4 py-2 md:px-6 bg-canvas border-b border-ghost-border shrink-0"
        >
          <div class="w-full max-w-200 mx-auto flex items-center gap-2">
            <BaseButton
              variant="ghost"
              on="ghost"
              :aria-label="t('groups.settings.go_back')"
              :icon="ArrowLeft"
              @click="leaveSettings"
            />
            <div>
              <h2>{{ t('groups.settings.title') }}</h2>
            </div>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto overscroll-contain py-4 md:p-4">
          <div class="flex flex-col max-w-200 mx-auto">
            <BaseList
              v-for="(item, index) in navItems"
              :key="item.id"
              :separator="index !== navItems.length - 1"
              @click="selectTab(item.id)"
            >
              <template #icon>
                <component :is="item.icon" :size="20" :stroke-width="1.8" />
              </template>
              <template #label>
                {{ item.label }}
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
          class="flex items-center py-2 px-4 md:px-6 bg-canvas border-b border-ghost-border shrink-0"
        >
          <div
            class="header-left max-w-250 my-0 mx-auto flex items-center w-full gap-2"
          >
            <BaseButton
              variant="ghost"
              on="ghost"
              :aria-label="t('groups.settings.go_back')"
              :icon="ArrowLeft"
              @click="goBack"
            />
            <h2>{{ activeTabLabel }}</h2>
          </div>
        </header>

        <div
          class="flex flex-1 flex-col overflow-y-auto overscroll-contain p-6 pt-4 md:py-8 bg-canvas"
        >
          <div class="flex w-full max-w-250 flex-1 flex-col mx-auto">
            <GroupSettingsMyCourses v-if="activeTab === 'courses'" />

            <GroupSettingsMembers
              v-if="activeTab === 'members' && !route.params.subTab"
            />

            <GroupSettingsMembersBanned
              v-else-if="
                activeTab === 'members' && route.params.subTab === 'banned'
              "
            />

            <GroupSettingsMembersInvites
              v-else-if="
                activeTab === 'members' && route.params.subTab === 'invites'
              "
            />

            <GroupSettingsSchedule v-if="activeTab === 'schedule'" />

            <GroupSettingsAnnouncements v-if="activeTab === 'announcements'" />

            <GroupSettingsSubjects v-if="activeTab === 'subjects'" />

            <GroupSettingsPermissions
              v-if="activeTab === 'permissions'"
              :can-manage="hasOwnerRights"
            />

            <GroupSettingsGeneral v-if="activeTab === 'general'" />
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
  height: calc(100dvh - var(--header-height));
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
