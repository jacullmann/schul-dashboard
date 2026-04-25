<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import {
  PanelLeft,
  CirclePlus,
  House,
  ListTodo,
  CalendarDays,
  UsersRound,
  SlidersHorizontal,
  Lock,
  Search,
} from '@lucide/vue';
import AccountMenu from '@/modules/auth/components/AccountMenu.vue';
import { useSearchModal } from '@/core/composables/useSearchModal';
import { useItemForm } from '@/core/composables/useItemForm';
import { useModalStore } from '@/stores/modalStore';
import { storeToRefs } from 'pinia';
import hw from '@/api/hwApi.ts';
import { onMounted, onUnmounted } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth.ts';
import { useRouter } from 'vue-router';
import { useMfa } from '@/modules/auth/composables/useMfa.ts';
import SidebarButton from '@/core/components/SidebarButton.vue';
import { useI18n } from 'vue-i18n';
import { useGroupAction } from '@/core/composables/useGroupAction';
import { computed } from 'vue';

const { t } = useI18n();
const { resetMfaState } = useMfa();

const userStore = useUserStore();
const { user, isGroupAdmin, isSuperadmin } = storeToRefs(userStore);

const { activeGroupId, userGroups, logout: appAuthLogout } = useAppAuth();
const router = useRouter();

const modalStore = useModalStore();
const { sidebarExpanded: isExpanded } = storeToRefs(modalStore);
const { openSearch } = useSearchModal();
const { openItemForm } = useItemForm();
const { withGroup } = useGroupAction();

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

async function logout() {
  try {
    await hw.post('/api/auth/logout');
  } catch (err) {
    console.error('Logout failed:', err);
  } finally {
    userStore.clearUser();
    resetMfaState();
    await appAuthLogout();
    await router.push('/');
    collapseIfMobile();
  }
}

function collapseIfMobile() {
  if (window.innerWidth < 768) {
    // 768px is Tailwind's 'md' breakpoint
    modalStore.setSidebarExpanded(false);
  }
}

function handleNavigation(path: string) {
  router.push(path);
  collapseIfMobile();
}

function handleSearch() {
  openSearch();
  collapseIfMobile();
}

function handleCreate() {
  collapseIfMobile();
  withGroup(() => {
    openItemForm();
  });
}

onMounted(() => {
  if (!userStore.initialized) {
    userStore.fetchUser();
  }
});

function handleGroupClick(groupId: string) {
  const currentPath = router.currentRoute.value.path;
  if (
    activeGroupId.value &&
    currentPath.includes(`/groups/${activeGroupId.value}`)
  ) {
    handleNavigation(currentPath.replace(activeGroupId.value, groupId));
  } else {
    handleNavigation(`/groups/${groupId}/items/all`);
  }
}

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isExpanded"
      class="md:hidden fixed inset-0 bg-black/50 z-(--z-modal-overlay)"
      @click="isExpanded = false"
    ></div>
  </transition>

  <aside
    class="sidebar transition-all duration-200 ease-[cubic-bezier(0.4, 0, 0.2, 1)] flex flex-col justify-between shrink-0 overflow-hidden h-screen p-3 bg-surface border-r border-surface-border z-(--z-modal)"
    :class="[
      'md:sticky md:top-0',
      isExpanded ? 'md:w-64' : 'md:w-[61px]',

      'max-md:fixed max-md:top-0 max-md:left-0 max-md:w-64 max-md:shadow-xl',
      isExpanded ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
    ]"
  >
    <div class="flex flex-col gap-4 w-full">
      <SidebarButton
        :label="isExpanded ? t('sidebar.collapse') : t('sidebar.expand')"
        :shortcut="['ctrl', 'shift', 'd']"
        :expanded="isExpanded"
        class="hidden md:flex"
        :icon="PanelLeft"
        @click="toggleExpanded"
      />

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('sidebar.create')"
          :shortcut="['alt', 'n']"
          :expanded="isExpanded"
          :icon="CirclePlus"
          @click="handleCreate"
        />

        <SidebarButton
          :label="t('sidebar.search')"
          :shortcut="['ctrl', 'k']"
          :expanded="isExpanded"
          :icon="Search"
          @click="handleSearch"
        />
      </div>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('sidebar.home')"
          :expanded="isExpanded"
          :active="$route.path.startsWith('/home')"
          :icon="House"
          @click="handleNavigation('/home')"
        />

        <SidebarButton
          :label="t('sidebar.tasks')"
          :expanded="isExpanded"
          :active="$route.path.startsWith(`/groups/${activeGroupId}/items`)"
          :icon="ListTodo"
          @click="
            withGroup(() =>
              handleNavigation(`/groups/${activeGroupId}/items/all`),
            )
          "
        />

        <SidebarButton
          :label="t('sidebar.schedule')"
          :expanded="isExpanded"
          :active="$route.path.startsWith(`/groups/${activeGroupId}/schedule`)"
          :icon="CalendarDays"
          @click="
            withGroup(() =>
              handleNavigation(`/groups/${activeGroupId}/schedule`),
            )
          "
        />

        <SidebarButton
          :label="t('sidebar.groups')"
          :expanded="isExpanded"
          :active="$route.path === '/groups'"
          :icon="UsersRound"
          @click="handleNavigation('/groups')"
        />

        <SidebarButton
          v-if="isAnyGroupAdmin"
          :label="t('sidebar.admin')"
          :expanded="isExpanded"
          :active="$route.path.startsWith(`/groups/${activeGroupId}/admin`)"
          :icon="SlidersHorizontal"
          @click="
            withGroup(() => handleNavigation(`/groups/${activeGroupId}/admin`))
          "
        />

        <SidebarButton
          :label="t('sidebar.private')"
          :expanded="isExpanded"
          :active="$route.path.startsWith('/todos')"
          :icon="Lock"
          @click="handleNavigation('/todos')"
        />
      </div>

      <BaseMenuDivider />

      <div class="flex flex-col gap-0 w-full overflow-y-auto">
        <SidebarButton
          v-for="(group, index) in userGroups"
          :key="index"
          :label="group.name"
          :expanded="isExpanded"
          :active="activeGroupId === group.id"
          :unread="group.hasUnreadContent"
          @click="handleGroupClick(group.id)"
        />
      </div>
    </div>

    <div class="flex flex-col w-full gap-1">
      <div
        class="flex w-full transition-all duration-200 justify-start ml-0.5 max-[480px]:ml-1.25"
      >
        <AccountMenu
          v-if="user"
          :email="user.email"
          :user-data="user"
          @logout="logout"
          @personalization-changed="onPersonalizationChanged"
        />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.fade-links-enter-active,
.fade-links-leave-active {
  transition: opacity 0.15s ease;
}
.fade-links-enter-from,
.fade-links-leave-to {
  opacity: 0;
}
</style>
