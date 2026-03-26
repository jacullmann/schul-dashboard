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
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth.ts';
import { useRouter } from 'vue-router';
import { useMfa } from '@/modules/auth/composables/useMfa.ts';
import SidebarButton from '@/core/components/SidebarButton.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { resetMfaState } = useMfa();

const userStore = useUserStore();
const { user, needsSetup, hasShownSetup } = storeToRefs(userStore);

const { activeGroupId, logout: appAuthLogout } = useAppAuth();
const router = useRouter();

const showSetupModal = ref(false);
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
    class="sidebar sticky top-0 h-screen p-3 bg-surface border-r border-surface-border flex flex-col justify-between shrink-0 overflow-hidden"
    :class="isExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'"
  >
    <div class="flex flex-col gap-2">
      <!-- Toggle button -->
      <SidebarButton
        :label="t('sidebar.collapse')"
        :expanded="isExpanded"
        @click="toggleExpanded"
        class="mb-4"
      >
        <PanelLeft
          :size="24"
          class="toggle-icon"
          :class="{ 'rotate-180': isExpanded }"
        />
      </SidebarButton>

      <!-- Quick Action -->
      <SidebarButton :label="t('sidebar.create')" :expanded="isExpanded">
        <CirclePlus :size="24" />
      </SidebarButton>

      <div class="flex flex-col gap-1 mt-4">
        <SidebarButton
          :label="t('sidebar.home')"
          :expanded="isExpanded"
          @click="router.push('/home')"
        >
          <House :size="24" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.tasks')"
          :expanded="isExpanded"
          @click="router.push(`/groups/${activeGroupId}/items/all`)"
        >
          <ListTodo :size="24" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.schedule')"
          :expanded="isExpanded"
          @click="router.push(`/groups/${activeGroupId}/schedule`)"
        >
          <CalendarDays :size="24" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.groups')"
          :expanded="isExpanded"
          @click="router.push('/home')"
        >
          <UsersRound :size="24" />
        </SidebarButton>

        <SidebarButton
          :label="t('sidebar.security')"
          :expanded="isExpanded"
          @click="router.push('/todos')"
        >
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

<style scoped>
.sidebar {
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
  align-items: stretch;
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-expanded {
  width: 220px;
}

.toggle-icon {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
