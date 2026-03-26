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
import { onClickOutside, useEventListener } from '@vueuse/core';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth.ts';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMfa } from '@/modules/auth/composables/useMfa.ts';
import SidebarButton from '@/core/components/SidebarButton.vue';

const { t } = useI18n();
const { resetMfaState } = useMfa();

const userStore = useUserStore();
const { user, loading, needsSetup, hasShownSetup, isGroupAdmin } =
  storeToRefs(userStore);

const {
  groupName,
  userGroups,
  activeGroupId,
  switchActiveGroup,
  logout: appAuthLogout,
} = useAppAuth();
const router = useRouter();
const route = useRoute();

const navOpen = ref(false);
const showSetupModal = ref(false);
const groupMenuOpen = ref(false);
const groupMenuRef = ref<HTMLElement | null>(null);

const logoLink = computed(() => {
  /* if (activeGroupId.value) {
    return `/groups/${activeGroupId.value}/items/all`;
  } */
  return '/home';
});

function toggleGroupMenu() {
  groupMenuOpen.value = !groupMenuOpen.value;
}

async function onSwitchGroup(id: string) {
  groupMenuOpen.value = false;
  const oldGroupId = activeGroupId.value;
  if (id !== oldGroupId) {
    const res = await switchActiveGroup(id);
    if (res.ok) {
      // Ensure user store is synced before routing so guards see correct permissions
      await userStore.fetchUser();

      // Navigate to the same path but with the new group id
      if (oldGroupId && route.path.startsWith(`/groups/${oldGroupId}`)) {
        const newPath = route.path.replace(
          `/groups/${oldGroupId}`,
          `/groups/${id}`,
        );
        await router.push(newPath);

        // If the guard redirected us to /home (e.g. missing permissions), fall back to items/all
        if (route.path === '/home') {
          await router.push(`/groups/${id}/items/all`);
        }
      } else {
        await router.push(`/groups/${id}/items/all`);
      }
    } else {
      console.error('Failed to switch group', res.error);
    }
  }
}

onClickOutside(groupMenuRef, () => {
  groupMenuOpen.value = false;
});

const toggleNav = () => {
  navOpen.value = !navOpen.value;
  document.body.style.overflow = navOpen.value ? 'hidden' : '';
};

const closeNav = () => {
  navOpen.value = false;
  document.body.style.overflow = '';
};

function onPersonalizationChanged(value: boolean) {
  userStore.updateUser({ personalized: value });
}

function onMfaChanged(enabled: boolean) {
  userStore.setMfaEnabled(enabled);
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && navOpen.value) closeNav();
};

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

useEventListener(document, 'keydown', handleEscape);

onMounted(() => {
  if (!userStore.initialized) {
    userStore.fetchUser();
  }
});

watch(needsSetup, (needs) => {
  if (needs && !hasShownSetup.value) {
    showSetupModal.value = true;
    userStore.markSetupShown();
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <div
    class="fixed h-screen p-3 bg-surface border-r border-surface-border flex flex-col justify-between items-center"
  >
    <div class="flex flex-col gap-8">y
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

        <SidebarButton @click="router.push('/groups/${activeGroupId.value}/items/all')">
          <ListTodo :size="24" />
        </SidebarButton>

        <SidebarButton @click="router.push('/groups/${activeGroupId.value}/schedule')">
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
    </div>
</template>
