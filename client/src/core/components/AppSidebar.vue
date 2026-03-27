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
} from '@lucide/vue';
import AccountMenu from '@/modules/auth/components/AccountMenu.vue';
import { storeToRefs } from 'pinia';
import hw from '@/api/hwApi.ts';
import { onMounted, onUnmounted, ref } from 'vue';
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

const isExpanded = ref(false);

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function onPersonalizationChanged(value: boolean) {
  userStore.updateUser({ personalized: value });
}

function onMfaChanged(enabled: boolean) {
  userStore.setMfaEnabled(enabled);
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
  }
}

async function onAccountDeleted() {
  userStore.clearUser();
  resetMfaState();
  await appAuthLogout();
  router.push('/');
}

function onAccountDeleteError(msg: string) {
  console.error('Account delete error:', msg);
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
  <aside
    class="sidebar transition-[width] duration-300 ease-[cubic-bezier(0.4, 0, 0.2, 1)] items-center sticky top-0 h-screen py-3 px-2.5 bg-surface border-r border-surface-border flex flex-col justify-between shrink-0 overflow-hidden"
    :class="isExpanded ? 'w-52' : 'w-14'"
  >
    <div class="flex flex-col gap-4 w-full">
      <SidebarButton
        :label="t('sidebar.collapse')"
        :expanded="isExpanded"
        @click="toggleExpanded"
      >
        <PanelLeft :size="20" />
      </SidebarButton>

      <SidebarButton :label="t('sidebar.create')" :expanded="isExpanded">
        <CirclePlus :size="20" />
      </SidebarButton>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('sidebar.home')"
          :expanded="isExpanded"
          @click="router.push('/home')"
        >
          <House :size="20" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.tasks')"
          :expanded="isExpanded"
          @click="router.push(`/groups/${activeGroupId}/items/all`)"
        >
          <ListTodo :size="20" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.schedule')"
          :expanded="isExpanded"
          @click="router.push(`/groups/${activeGroupId}/schedule`)"
        >
          <CalendarDays :size="20" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.groups')"
          :expanded="isExpanded"
          @click="router.push('/home')"
        >
          <UsersRound :size="20" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.security')"
          :expanded="isExpanded"
          @click="router.push('/todos')"
        >
          <Lock :size="20" />
        </SidebarButton>
      </div>
    </div>

    <div class="flex w-full transition-all duration-300 justify-start ml-[2px] max-[480px]:ml-[5px]">
      <AccountMenu
        v-if="user"
        :email="user.email"
        :user-data="user"
        @deleted="onAccountDeleted"
        @error="onAccountDeleteError"
        @logout="logout"
        @personalization-changed="onPersonalizationChanged"
        @mfa-changed="onMfaChanged"
      />
    </div>
  </aside>
</template>
