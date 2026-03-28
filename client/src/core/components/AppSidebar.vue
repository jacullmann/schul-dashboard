<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import {
  PanelLeft,
  CirclePlus,
  House,
  ListTodo,
  CalendarDays,
  UsersRound,
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

const { t } = useI18n();
const { resetMfaState } = useMfa();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const { activeGroupId, logout: appAuthLogout } = useAppAuth();
const router = useRouter();

const modalStore = useModalStore();
const { sidebarExpanded: isExpanded } = storeToRefs(modalStore);
const { openSearch } = useSearchModal();
const { openItemForm } = useItemForm();

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
    router.push('/');
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
  openItemForm();
  collapseIfMobile();
}

onMounted(() => {
  if (!userStore.initialized) {
    userStore.fetchUser();
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <div
    v-if="isExpanded"
    class="md:hidden fixed inset-0 bg-black/50 z-[40000] transition-opacity duration-200"
    @click="isExpanded = false"
  ></div>

  <button
    v-if="!isExpanded"
    class="md:hidden fixed top-3 left-2.5 z-[40000] p-2 text-on-surface bg-surface rounded-md border border-surface-border shadow-sm hover:bg-surface-hover transition-colors"
    @click="toggleExpanded"
  >
    <PanelLeft :size="20" />
  </button>

  <aside
    class="sidebar transition-all duration-200 ease-[cubic-bezier(0.4, 0, 0.2, 1)] flex flex-col justify-between shrink-0 overflow-hidden h-screen p-1 bg-surface border-r border-surface-border z-[5000000]"
    :class="[
      'md:sticky md:top-0',
      isExpanded ? 'md:w-52' : 'md:w-11',

      'max-md:fixed max-md:top-0 max-md:left-0 max-md:w-52 max-md:shadow-xl',
      isExpanded ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
    ]"
  >
    <div class="flex flex-col gap-4 w-full">
      <SidebarButton
        :label="t('sidebar.collapse')"
        :expanded="isExpanded"
        @click="toggleExpanded"
      >
        <PanelLeft :size="20" />
      </SidebarButton>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('sidebar.create')"
          :expanded="isExpanded"
          @click="handleCreate"
        >
          <CirclePlus :size="20" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.search')"
          :expanded="isExpanded"
          @click="handleSearch"
        >
          <Search :size="20" />
        </SidebarButton>
      </div>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('sidebar.home')"
          :expanded="isExpanded"
          @click="handleNavigation('/home')"
        >
          <House :size="20" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.tasks')"
          :expanded="isExpanded"
          @click="handleNavigation(`/groups/${activeGroupId}/items/all`)"
        >
          <ListTodo :size="20" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.schedule')"
          :expanded="isExpanded"
          @click="handleNavigation(`/groups/${activeGroupId}/schedule`)"
        >
          <CalendarDays :size="20" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.groups')"
          :expanded="isExpanded"
          @click="handleNavigation('/home')"
        >
          <UsersRound :size="20" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.security')"
          :expanded="isExpanded"
          @click="handleNavigation('/todos')"
        >
          <Lock :size="20" />
        </SidebarButton>
      </div>
    </div>

    <div
      class="flex w-full transition-all duration-200 justify-start ml-[2px] max-[480px]:ml-[5px]"
    >
      <AccountMenu
        v-if="user"
        :email="user.email"
        :user-data="user"
        @logout="logout"
        @personalization-changed="onPersonalizationChanged"
      />
    </div>
  </aside>
</template>
