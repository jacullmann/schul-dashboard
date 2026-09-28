<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import {
  PanelLeft,
  SquarePen,
  Megaphone,
  House,
  UsersRound,
  ListTodo,
  CalendarDays,
  Settings,
  Crown,
  Lock as LockIcon,
  Search,
  MessageCircle,
  Plus,
} from '@lucide/vue';
import AccountMenu from '@/modules/auth/components/AccountMenu.vue';
import { useSearchModal } from '@/core/composables/useSearchModal';
import { useTaskForm } from '@/core/composables/useTaskForm';
import { useAnnouncementForm } from '@/core/composables/useAnnouncementForm';
import { useModalStore } from '@/stores/modalStore';
import { storeToRefs } from 'pinia';
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useLogout } from '@/core/composables/useLogout';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import SidebarButton from '@/core/components/SidebarButton.vue';
import { useI18n } from 'vue-i18n';
import { useGroupAction } from '@/core/composables/useGroupAction';
import { useOpenGroup } from '@/core/composables/useOpenGroup';
import Avatar from '@/modules/auth/components/Avatar.vue';

const { t } = useI18n();
const performLogout = useLogout();

const userStore = useUserStore();
const { user, isGroupAdmin, isSuperadmin } = storeToRefs(userStore);

const { activeGroupId, contextGroupId, userGroups } = useAppAuth();
const router = useRouter();

const modalStore = useModalStore();
const { sidebarExpanded: isExpanded } = storeToRefs(modalStore);
const { openSearch } = useSearchModal();
const { openTaskForm } = useTaskForm();
const { openAnnouncementForm } = useAnnouncementForm();
const { withGroup } = useGroupAction();
const { openGroup } = useOpenGroup();

const isAnyGroupAdmin = computed(() => {
  if (isSuperadmin?.value) return true;
  if (isGroupAdmin?.value) return true;
  return userGroups.value?.some(
    (g) => g.role === 'admin' || g.role === 'moderator',
  );
});

function toggleExpanded() {
  modalStore.toggleSidebar();
}

function onPersonalizationChanged(value: boolean) {
  userStore.updateUser({ personalized: value });
}

function handleNavigation(to: RouteLocationRaw) {
  void router.push(to);
}

function handleTask() {
  withGroup((groupId) => openTaskForm(groupId));
}

function handleAnnouncement() {
  withGroup((groupId) => openAnnouncementForm(groupId));
}

const sidebarScrollEl = ref<HTMLElement | null>(null);

const showTopFade = ref(false);
const showBottomFade = ref(false);

function updateFadeState(el: HTMLElement | null) {
  if (!el) {
    showTopFade.value = false;
    showBottomFade.value = false;
    return;
  }
  showTopFade.value = el.scrollTop > 1;
  showBottomFade.value = el.scrollHeight - el.scrollTop - el.clientHeight > 1;
}

let scrollTicking = false;

function handleScroll() {
  if (!scrollTicking) {
    requestAnimationFrame(() => {
      updateFadeState(sidebarScrollEl.value);
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}

const fadeMask = computed(() => {
  const top = showTopFade.value;
  const bottom = showBottomFade.value;

  if (top && bottom) {
    return 'linear-gradient(to bottom, transparent 0px, black 32px, black calc(100% - 32px), transparent 100%)';
  } else if (top) {
    return 'linear-gradient(to bottom, transparent 0px, black 32px)';
  } else if (bottom) {
    return 'linear-gradient(to top, transparent 0px, black 32px)';
  }
  return 'none';
});

let resizeObserver: ResizeObserver | null = null;

function setupObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  const el = sidebarScrollEl.value;
  if (!el) {
    showTopFade.value = false;
    showBottomFade.value = false;
    return;
  }

  updateFadeState(el);

  resizeObserver = new ResizeObserver(() => {
    updateFadeState(sidebarScrollEl.value);
  });
  resizeObserver.observe(el);

  for (const child of el.children) {
    resizeObserver.observe(child);
  }
}

watch(sidebarScrollEl, () => {
  setupObserver();
});

watch(
  userGroups,
  () => {
    void nextTick(() => {
      setupObserver();
    });
  },
  { deep: true },
);

onMounted(() => {
  if (!userStore.initialized) {
    void userStore.fetchUser();
  }
  setupObserver();
});

function openGroupPage(name: string) {
  withGroup((groupId) => handleNavigation({ name, params: { groupId } }));
}

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <aside
    class="sidebar sticky top-0 flex flex-col justify-between shrink-0 overflow-hidden h-dvh p-2.5 bg-surface border-r border-ghost-border z-(--z-header) transition-[width]"
    :class="
      isExpanded
        ? 'w-64 duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
        : 'w-[61px] duration-150 ease-[cubic-bezier(0.32,0,0.67,1)]'
    "
  >
    <div class="flex flex-col gap-4 w-full flex-1 min-h-0">
      <div class="flex flex-col w-full">
        <SidebarButton
          :label="
            isExpanded
              ? t('common.sidebar.collapse')
              : t('common.sidebar.expand')
          "
          :shortcut="['ctrl', 'shift', 'd']"
          :expanded="isExpanded"
          :icon="PanelLeft"
          :page="false"
          @click="toggleExpanded"
        />
      </div>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('common.sidebar.task')"
          :shortcut="['alt', 'n']"
          :expanded="isExpanded"
          :icon="SquarePen"
          :page="false"
          @click="handleTask"
        />

        <SidebarButton
          v-if="isAnyGroupAdmin"
          :label="t('common.sidebar.announcement')"
          :shortcut="['alt', 'a']"
          :expanded="isExpanded"
          :icon="Megaphone"
          :page="false"
          @click="handleAnnouncement"
        />

        <SidebarButton
          :label="t('common.sidebar.search')"
          :shortcut="['ctrl', 'k']"
          :expanded="isExpanded"
          :icon="Search"
          :page="false"
          @click="openSearch"
        />
      </div>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('common.sidebar.dashboard')"
          :expanded="isExpanded"
          :active="$route.name === 'group-dashboard'"
          :icon="House"
          :page="true"
          @click="openGroupPage('group-dashboard')"
        />

        <SidebarButton
          :label="t('common.sidebar.tasks')"
          :expanded="isExpanded"
          :active="$route.name === 'group-tasks'"
          :icon="ListTodo"
          :page="true"
          @click="openGroupPage('group-tasks')"
        />

        <SidebarButton
          :label="t('common.sidebar.schedule')"
          :expanded="isExpanded"
          :active="$route.name === 'group-schedule'"
          :icon="CalendarDays"
          :page="true"
          @click="openGroupPage('group-schedule')"
        />

        <SidebarButton
          :label="t('common.sidebar.messages')"
          :expanded="isExpanded"
          :active="$route.name === 'group-messages'"
          :icon="MessageCircle"
          :page="true"
          @click="openGroupPage('group-messages')"
        />

        <SidebarButton
          v-if="contextGroupId"
          :label="t('common.sidebar.admin')"
          :expanded="isExpanded"
          :active="$route.name === 'group-admin'"
          :icon="Settings"
          :page="true"
          @click="openGroupPage('group-admin')"
        />

        <SidebarButton
          v-if="isSuperadmin"
          :label="t('common.roles.superadmin')"
          :expanded="isExpanded"
          :active="$route.path.startsWith('/admin')"
          :icon="Crown"
          :page="true"
          @click="handleNavigation({ name: 'super-admin' })"
        />
      </div>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('common.sidebar.groups')"
          :expanded="isExpanded"
          :active="['/groups', '/groups/'].includes($route.path)"
          :icon="UsersRound"
          :page="true"
          @click="handleNavigation('/groups')"
        />

        <SidebarButton
          :label="t('common.sidebar.private')"
          :expanded="isExpanded"
          :active="$route.path.startsWith('/private')"
          :icon="LockIcon"
          :page="true"
          @click="handleNavigation('/private')"
        />
      </div>

      <BaseMenuDivider />

      <div
        ref="sidebarScrollEl"
        class="flex flex-col gap-2 -mx-2.5 px-2.5 overflow-y-auto overflow-x-hidden flex-1 list-fade"
        :style="{ '--menu-fade-mask': fadeMask }"
        @scroll="handleScroll"
      >
        <BaseTooltip
          v-for="(group, index) in userGroups"
          :key="index"
          :content="group.name"
          placement="right"
        >
          <button
            v-wave
            :class="activeGroupId === group.id ? 'active' : ''"
            class="group relative gap-0 items-center flex p-1 text-on-ghost-muted hover:text-on-ghost rounded-full bg-transparent hover:bg-surface-hover transition-hover cursor-pointer outline-none w-full touch-target after:min-w-[calc(100%+24px)] after:min-h-12"
            @click="openGroup(group.id, 'group-tasks')"
          >
            <span
              class="absolute transition-[max-height,width,top,opacity] duration-200 -left-2.5 group-[.active]:top-0 group-hover:top-[25%] top-[45%] bottom-0 w-0.5 opacity-0 group-[.active]:w-1 group-hover:w-1 group-[.active]:opacity-100 group-hover:opacity-100 group-[.active]:max-h-full group-hover:max-h-[50%] max-h-[10%] bg-action rounded-r-full"
            ></span>
            <Avatar :name="group.name" :picture="group.avatarUrl" :size="8" />
            <span
              class="transition-[max-width,opacity,margin-left] text-sm/5 font-medium whitespace-nowrap overflow-hidden"
              :class="
                isExpanded
                  ? 'max-w-40 opacity-100 ml-2 duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
                  : 'max-w-0 opacity-0 ml-0 duration-150 ease-[cubic-bezier(0.32,0,0.67,1)]'
              "
            >
              {{ group.name }}
            </span>
          </button>
        </BaseTooltip>

        <SidebarButton
          :label="t('common.sidebar.create')"
          :expanded="isExpanded"
          :icon="Plus"
          :page="false"
          @click="modalStore.openCreateGroup()"
        />
      </div>
    </div>

    <AccountMenu
      v-if="user"
      class="w-full"
      :email="user.email"
      :user-data="user"
      :expanded="isExpanded"
      @logout="performLogout"
      @personalization-changed="onPersonalizationChanged"
    />
  </aside>
</template>

<style scoped>
.list-fade {
  -webkit-mask-image: var(--menu-fade-mask, none);
  mask-image: var(--menu-fade-mask, none);
}
</style>
