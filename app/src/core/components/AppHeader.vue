<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import AppLogo from '@/common/components/AppLogo.vue';
import {
  Menu,
  ChevronDown,
  Plus,
  LogOut,
  UserRoundPlus,
  Settings,
  UsersRound,
} from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useModalStore } from '@/stores/modalStore';
import Avatar from '@/modules/auth/components/Avatar.vue';
import AccountMenu from '@/modules/auth/components/AccountMenu.vue';
import { useLogout } from '@/core/composables/useLogout';
import { useIsMobileViewport } from '@/common/composables/useViewport';
import { useToast } from '@/common/composables/useToast';
import hw from '../../api/api';
import { groupPath } from '@/api/groupPath';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { t } = useI18n();
const performLogout = useLogout();
const isMobile = useIsMobileViewport();

const {
  groupName,
  activeGroupId,
  activeGroupAvatarUrl,
  activeGroupOwnerId,
  checkPermission,
  createInvite,
  checkAuthStatus,
} = useAppAuth();
const router = useRouter();

const modalStore = useModalStore();
const { sidebarExpanded: isExpanded } = storeToRefs(modalStore);
const toast = useToast();

function toggleExpanded() {
  modalStore.toggleSidebar();
}

function onPersonalizationChanged(value: boolean) {
  userStore.updateUser({ personalized: value });
}

const groupMenuOpen = ref(false);
const groupMenuRef = ref<HTMLElement | null>(null);

const logoLink = computed(() => '/groups');

function toggleGroupMenu() {
  groupMenuOpen.value = !groupMenuOpen.value;
}

function openGroupsPage() {
  groupMenuOpen.value = false;
  void router.push({ name: 'groups' });
}

onClickOutside(groupMenuRef, () => {
  groupMenuOpen.value = false;
});

const loading = ref(false);

async function leaveGroup() {
  const groupId = activeGroupId.value;
  if (!groupId) return;

  if (activeGroupOwnerId.value === user.value?.id) {
    toast.error(t('auth.groups.errors.owner_cannot_leave'));
    return;
  }

  const isConfirmed = await modalStore.confirm({
    title: t('common.header.leave_group_confirm.title'),
    content: t('common.header.leave_group_confirm.content', {
      group: groupName.value,
    }),
    submitText: t('common.header.leave_group_confirm.submit'),
    danger: true,
  });
  if (!isConfirmed) return;

  loading.value = true;
  try {
    await hw.delete(groupPath(groupId, '/leave'));
    await checkAuthStatus();
    await router.push({ name: 'groups' });
  } catch (err) {
    console.error('Failed to leave group:', err);
    toast.error(t('auth.groups.errors.leave_failed'));
  } finally {
    loading.value = false;
  }
}

function openGroupSettings() {
  groupMenuOpen.value = false;
  if (!activeGroupId.value) return;

  void router.push({
    name: 'group-admin',
    params: { groupId: activeGroupId.value },
  });
}

async function inviteMember() {
  groupMenuOpen.value = false;
  const groupId = activeGroupId.value;
  if (!groupId) return;
  loading.value = true;
  try {
    const res = await createInvite(groupId);
    if (res.ok && res.token) {
      modalStore.openInviteModal(res.token, groupId);
    } else {
      toast.error(res.error || t('auth.groups.errors.invite_failed'));
    }
  } catch (err) {
    console.error('Failed to generate invite link:', err);
    toast.error(t('auth.groups.errors.invite_failed'));
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (!userStore.initialized) {
    void userStore.fetchUser();
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <header
    class="sticky flex w-full justify-center items-center bg-canvas text-on-ghost border-b border-ghost-border font-display p-0 top-0 h-(--header-height) z-(--z-header)"
  >
    <div class="relative h-full w-full flex items-center gap-4 px-4 max-w-325">
      <BaseButton
        class="md:hidden -ml-1 shrink-0"
        variant="ghost"
        on="ghost"
        :aria-expanded="isExpanded"
        :aria-label="t('common.header.toggle_navigation')"
        :icon="Menu"
        @click="toggleExpanded"
      />

      <router-link :to="logoLink" class="logo-group hidden! !md:flex shrink-0">
        <AppLogo class="logo-img" aria-hidden="true" />
      </router-link>
      <router-link
        v-if="!(activeGroupId && groupName)"
        :to="logoLink"
        class="logo-group min-w-0"
      >
        <span class="logo-text truncate">schul-dashboard</span>
      </router-link>
      <div
        v-if="activeGroupId && groupName"
        ref="groupMenuRef"
        class="relative flex items-center min-w-0 max-w-full"
      >
        <button
          v-wave
          class="relative flex items-center gap-2 cursor-pointer hover:bg-ghost-hover transition-hover rounded-full -m-1 p-1 min-w-0 touch-target after:min-w-12 after:min-h-12"
          @click="toggleGroupMenu"
        >
          <Avatar
            :name="groupName"
            :picture="activeGroupAvatarUrl"
            :size="8"
            class="shrink-0"
          />

          <span class="logo-text leading-8 truncate min-w-0">{{
            groupName
          }}</span>
          <ChevronDown
            :size="16"
            class="text-on-ghost-muted mr-2 shrink-0 transition-transform duration-200 ease-in-out"
            :class="{ 'rotate-180': groupMenuOpen }"
          />
        </button>

        <BaseMenu
          :open="groupMenuOpen"
          class="top-full mt-1 left-0"
          @close="groupMenuOpen = false"
        >
          <BaseMenuButton :icon="UsersRound" @click="openGroupsPage">
            {{ t('common.header.switch_group') }}
          </BaseMenuButton>

          <BaseMenuDivider />

          <BaseMenuButton
            :icon="Plus"
            @click="
              groupMenuOpen = false;
              modalStore.openCreateGroup();
            "
          >
            {{ t('common.sidebar.create') }}
          </BaseMenuButton>

          <BaseMenuButton
            v-if="checkPermission('invite_members')"
            :icon="UserRoundPlus"
            :disabled="loading"
            @click="inviteMember"
          >
            {{ t('auth.groups.invite.invite_button_header') }}
          </BaseMenuButton>

          <BaseMenuButton :icon="Settings" @click="openGroupSettings">
            {{ t('common.sidebar.admin') }}
          </BaseMenuButton>

          <BaseMenuButton
            :icon="LogOut"
            variant="danger"
            :disabled="loading"
            @click="leaveGroup"
          >
            {{ t('common.header.leave_group') }}
          </BaseMenuButton>
        </BaseMenu>
      </div>

      <AccountMenu
        v-if="user && isMobile"
        class="ml-auto shrink-0"
        :email="user.email"
        :user-data="user"
        :expanded="false"
        tooltip-placement="left"
        @logout="performLogout"
        @personalization-changed="onPersonalizationChanged"
      />
    </div>
  </header>
</template>

<style scoped>
.logo-group {
  display: flex;
  align-items: center;
  text-decoration: none;
  gap: 0.6rem;
  color: var(--color-on-ghost);
  flex: 0 1 auto;
  line-height: 1;
}

.logo-img {
  width: auto;
  height: 32px;
}

.logo-text {
  font-size: var(--text-2xl);
  font-weight: 700;
  transition: opacity 0.2s ease;
}

@media (max-width: 1000px) {
  .logo-img {
    height: 26px;
  }
  .logo-text {
    font-size: var(--text-2xl);
  }
}

@media (max-width: 386px) {
  .logo-text {
    font-size: var(--text-xl);
  }
}
@media (max-width: 356px) {
  .logo-text {
    font-size: var(--text-lg);
  }
}
@media (max-width: 332px) {
  .logo-text {
    font-size: var(--text-base);
  }
}
</style>
