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
import { useEventListener } from '@vueuse/core';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth.ts';
import { useRouter } from 'vue-router';
import { useMfa } from '@/modules/auth/composables/useMfa.ts';
import SidebarButton from '@/core/components/SidebarButton.vue';

const { resetMfaState } = useMfa();

const userStore = useUserStore();
const { user, needsSetup, hasShownSetup } = storeToRefs(userStore);

const { activeGroupId, logout: appAuthLogout } = useAppAuth();
const router = useRouter();

const showSetupModal = ref(false);

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

function openSetupModal() {
  if (user.value) showSetupModal.value = true;
}

function onSetupSuccess(updatedUser: any) {
  userStore.updateUser(updatedUser);
  showSetupModal.value = false;
}

watch(needsSetup, (needs) => {
  if (needs && !hasShownSetup.value) {
    showSetupModal.value = true;
    userStore.markSetupShown();
  }
});

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
    class="sticky top-0 h-screen p-3 bg-surface border-r border-surface-border flex flex-col justify-between items-center shrink-0"
  >
    <div class="flex flex-col gap-8">
      <SidebarButton>
        <PanelLeft :size="24" />
      </SidebarButton>
      <SidebarButton>
        <CirclePlus :size="24" />
      </SidebarButton>
      <div class="flex flex-col gap-4">
        <SidebarButton @click="router.push('/home')">
          <House :size="24" />
        </SidebarButton>

        <SidebarButton @click="router.push(`/groups/${activeGroupId}/items/all`)">
          <ListTodo :size="24" />
        </SidebarButton>

        <SidebarButton @click="router.push(`/groups/${activeGroupId}/schedule`)">
          <CalendarDays :size="24" />
        </SidebarButton>

        <SidebarButton @click="router.push('/home')">
          <UsersRound :size="24" />
        </SidebarButton>

        <SidebarButton @click="router.push('/todos')">
          <Lock :size="24" />
        </SidebarButton>
      </div>
    </div>

    <AccountMenu
      v-if="user"
      :email="user.email"
      :user-data="user"
      @deleted="onAccountDeleted"
      @error="onAccountDeleteError"
      @open-setup="openSetupModal"
      @logout="logout"
      @personalization-changed="onPersonalizationChanged"
      @mfa-changed="onMfaChanged"
    />
  </aside>
</template>
