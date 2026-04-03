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

const legalLinks = [
  { to: '/legal/imprint', label: t('legal.imprint.title') },
  { to: '/legal/privacy-policy', label: t('legal.privacy.title') },
  { to: '/legal/terms', label: t('legal.terms.title') },
  { to: '/contact', label: t('contact.contact.title') },
];
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
  return userGroups.value?.some(g => g.role === 'admin' || g.role === 'moderator');
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
      class="md:hidden fixed inset-0 bg-black/50 z-[40000]"
      @click="isExpanded = false"
    ></div>
  </transition>

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
          @click="withGroup(() => handleNavigation(`/groups/${activeGroupId}/items/all`))"
        >
          <ListTodo :size="20" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.schedule')"
          :expanded="isExpanded"
          @click="withGroup(() => handleNavigation(`/groups/${activeGroupId}/schedule`))"
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
          v-if="isAnyGroupAdmin"
          :label="t('sidebar.admin')"
          :expanded="isExpanded"
          @click="withGroup(() => handleNavigation(`/groups/${activeGroupId}/admin`))"
        >
          <SlidersHorizontal :size="20" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.private')"
          :expanded="isExpanded"
          @click="handleNavigation('/todos')"
        >
          <Lock :size="20" />
        </SidebarButton>
      </div>
    </div>

    <div class="flex flex-col w-full gap-1">
      <!-- Legal links — only visible when sidebar is expanded -->
      <Transition name="fade-links">
        <div v-if="isExpanded" class="flex flex-col gap-0.5 px-1 pb-1">
          <router-link
            v-for="link in legalLinks"
            :key="link.to"
            :to="link.to"
            class="block px-2 py-1 rounded text-footnote text-on-surface-subtle hover:text-on-surface-muted transition-hover no-underline"
          >
            {{ link.label }}
          </router-link>
        </div>
      </Transition>

      <div class="flex w-full transition-all duration-200 justify-start ml-[2px] max-[480px]:ml-[5px]">
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
