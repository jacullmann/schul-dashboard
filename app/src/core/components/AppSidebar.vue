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
  Crown,
  Lock,
  Search,
} from '@lucide/vue';
import AccountMenu from '@/modules/auth/components/AccountMenu.vue';
import { useSearchModal } from '@/core/composables/useSearchModal';
import { useItemForm } from '@/core/composables/useItemForm';
import { useModalStore } from '@/stores/modalStore';
import { storeToRefs } from 'pinia';
import hw from '@/api/hwApi';
import { onMounted, onUnmounted } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useRouter } from 'vue-router';
import { useMfa } from '@/modules/auth/composables/useMfa';
import SidebarButton from '@/core/components/SidebarButton.vue';
import { useI18n } from 'vue-i18n';
import { useGroupAction } from '@/core/composables/useGroupAction';
import { computed } from 'vue';
import Avatar from '@/modules/auth/components/Avatar.vue';

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
  <Transition
    appear
    enter-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-[280ms] ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isExpanded"
      class="md:hidden fixed inset-0 bg-black/25 backdrop-blur-sm z-9997"
      @click="isExpanded = false"
    ></div>
  </Transition>

  <aside
    class="sidebar flex flex-col justify-between shrink-0 overflow-hidden h-dvh p-2.5 bg-surface border-r border-surface-border z-9998"
    :class="[
      'md:sticky md:top-0 md:transition-[width]',
      isExpanded
        ? 'md:w-64 md:duration-[400ms] md:ease-[cubic-bezier(0.22,1,0.36,1)]'
        : 'md:w-[61px] md:duration-150 md:ease-[cubic-bezier(0.32,0,0.67,1)]',

      'max-md:fixed max-md:top-0 max-md:left-0 max-md:w-64 max-md:shadow-xl max-md:transition-transform',
      isExpanded
        ? 'max-md:translate-x-0 max-md:duration-[400ms] max-md:ease-[cubic-bezier(0.22,1,0.36,1)]'
        : 'max-md:-translate-x-full max-md:duration-150 max-md:ease-[cubic-bezier(0.32,0,0.67,1)]',
    ]"
  >
    <div class="flex flex-col gap-4 w-full flex-1 min-h-0">
      <div class="hidden md:flex flex flex-col w-full">
        <SidebarButton
          :label="isExpanded ? t('sidebar.collapse') : t('sidebar.expand')"
          :shortcut="['ctrl', 'shift', 'd']"
          :expanded="isExpanded"
          :icon="PanelLeft"
          :page="false"
          @click="toggleExpanded"
        />
      </div>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('sidebar.create')"
          :shortcut="['alt', 'n']"
          :expanded="isExpanded"
          :icon="CirclePlus"
          :page="false"
          @click="handleCreate"
        />

        <SidebarButton
          :label="t('sidebar.search')"
          :shortcut="['ctrl', 'k']"
          :expanded="isExpanded"
          :icon="Search"
          :page="false"
          @click="handleSearch"
        />
      </div>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('sidebar.home')"
          :expanded="isExpanded"
          :active="$route.path.startsWith('/home')"
          :icon="House"
          :page="true"
          @click="handleNavigation('/home')"
        />

        <SidebarButton
          :label="t('sidebar.tasks')"
          :expanded="isExpanded"
          :active="$route.path.startsWith(`/groups/${activeGroupId}/items`)"
          :icon="ListTodo"
          :page="true"
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
          :page="true"
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
          :page="true"
          @click="handleNavigation('/groups')"
        />

        <SidebarButton
          v-if="isAnyGroupAdmin"
          :label="t('sidebar.admin')"
          :expanded="isExpanded"
          :active="$route.path.startsWith(`/groups/${activeGroupId}/admin`)"
          :icon="SlidersHorizontal"
          :page="true"
          @click="
            withGroup(() => handleNavigation(`/groups/${activeGroupId}/admin`))
          "
        />

        <SidebarButton
          v-if="isSuperadmin"
          label="Superadmin"
          :expanded="isExpanded"
          :active="$route.path.startsWith('/admin')"
          :icon="Crown"
          :page="true"
          @click="withGroup(() => handleNavigation('/admin'))"
        />

        <SidebarButton
          :label="t('sidebar.private')"
          :expanded="isExpanded"
          :active="$route.path.startsWith('/todos')"
          :icon="Lock"
          :page="true"
          @click="handleNavigation('/todos')"
        />
      </div>

      <BaseMenuDivider />

      <div
        class="flex flex-col gap-2 -mx-2.5 px-2.5 overflow-y-auto overflow-x-hidden flex-1 list-fade"
      >
        <button
          v-for="(group, index) in userGroups"
          :key="index"
          :class="activeGroupId === group.id ? 'active' : ''"
          @click="handleGroupClick(group.id)"
          class="group relative gap-0 items-center flex p-1 text-on-ghost-muted hover:text-on-ghost rounded-full bg-transparent hover:bg-surface-hover transition-hover cursor-pointer outline-none w-full touch-target-x-full"
        >
          <span
            class="absolute transition-[max-height,width,top,opacity] duration-200 -left-2.5 group-[.active]:top-0 group-hover:top-[25%] top-[45%] bottom-0 w-0.5 opacity-0 group-[.active]:w-1 group-hover:w-1 group-[.active]:opacity-100 group-hover:opacity-100 group-[.active]:max-h-full group-hover:max-h-[50%] max-h-[10%] bg-action rounded-r-full"
          ></span>
          <Avatar
            :name="group.name"
            :picture="group.avatarUrl"
            :size="8"
            :unread="group.hasUnreadContent"
          />
          <span
            class="transition-[max-width,opacity,margin-left] transition-hover text-sm/5 font-medium whitespace-nowrap overflow-hidden"
            :class="
              isExpanded
                ? 'max-w-40 opacity-100 ml-2 duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
                : 'max-w-0 opacity-0 ml-0 duration-150 ease-[cubic-bezier(0.32,0,0.67,1)]'
            "
          >
            {{ group.name }}
          </span>
        </button>
      </div>
    </div>

    <AccountMenu
      v-if="user"
      :email="user.email"
      :user-data="user"
      :expanded="isExpanded"
      @logout="logout"
      @personalization-changed="onPersonalizationChanged"
      @click="collapseIfMobile"
    />
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

.list-fade {
  /* Fades out the bottom 32px of the container */
  -webkit-mask-image: linear-gradient(
    to bottom,
    black calc(100% - 32px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    black calc(100% - 32px),
    transparent 100%
  );
}
</style>
