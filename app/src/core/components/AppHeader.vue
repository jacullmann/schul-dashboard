<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onClickOutside, useWindowScroll } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import {
  ChevronDown,
  Plus,
  LogOut,
  UserRoundPlus,
  Settings,
  ArrowLeftRight,
  // TODO(search-chat): disabled until search and chat are ready.
  // Search,
} from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useModalStore } from '@/stores/modalStore';
import Avatar from '@/modules/auth/components/Avatar.vue';
import AccountMenu from '@/modules/auth/components/AccountMenu.vue';
import { useLogout } from '@/core/composables/useLogout';
import { useIsMobileViewport } from '@/common/composables/useViewport';
// import { useSearchModal } from '@/core/composables/useSearchModal';
import { useGroupMenuActions } from '@/modules/groups/composables/useGroupMenuActions';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { t } = useI18n();
const performLogout = useLogout();
const isMobile = useIsMobileViewport();
// const { openSearch } = useSearchModal();
const { y: scrollY } = useWindowScroll();
const isScrolled = computed(() => scrollY.value > 0);

const {
  groupName,
  activeGroupId,
  activeGroupAvatarUrl,
  activeGroupOwnerId,
  checkPermission,
} = useAppAuth();
const router = useRouter();

const modalStore = useModalStore();

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

const { pending, inviteMember, openGroupSettings, leaveGroup } =
  useGroupMenuActions();

function leaveActiveGroup() {
  if (!activeGroupId.value || !groupName.value) return;
  void leaveGroup({
    id: activeGroupId.value,
    name: groupName.value,
    ownerId: activeGroupOwnerId.value,
  });
}

function openActiveGroupSettings() {
  groupMenuOpen.value = false;
  if (activeGroupId.value) openGroupSettings(activeGroupId.value);
}

function inviteToActiveGroup() {
  groupMenuOpen.value = false;
  if (activeGroupId.value) void inviteMember(activeGroupId.value);
}

onMounted(() => {
  if (!userStore.initialized) {
    void userStore.fetchUser();
  }
});
</script>

<template>
  <header
    class="relative flex w-full justify-center items-center overflow-x-clip text-on-ghost font-display p-0 h-(--header-height) z-(--z-header)"
  >
    <!-- Stays within the header, so it never covers the announcement bar
         docked below. The x-clip trims the fade's sideways bleed, which would
         otherwise paint over the sidebar's border and widen the page. Only
         shown once scrolled, sparing the backdrop filters when there is
         nothing underneath. -->
    <BaseScrollFade v-show="isScrolled" class="inset-0 -bottom-4" />

    <div class="relative h-full w-full flex items-center gap-2 px-4 max-w-325">
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
          class="relative flex items-center gap-2 cursor-pointer hover:bg-ghost-hover active:bg-ghost-hover transition-hover rounded-full p-1 min-w-0 touch-target after:min-w-12 after:min-h-12"
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
          <BaseMenuButton
            :icon="Plus"
            @click="
              groupMenuOpen = false;
              modalStore.openCreateGroup();
            "
          >
            {{ t('common.sidebar.create') }}
          </BaseMenuButton>

          <BaseMenuButton :icon="ArrowLeftRight" @click="openGroupsPage">
            {{ t('common.header.switch_group') }}
          </BaseMenuButton>

          <BaseMenuDivider />

          <BaseMenuButton
            v-if="checkPermission('invite_members')"
            :icon="UserRoundPlus"
            :disabled="pending"
            @click="inviteToActiveGroup"
          >
            {{ t('auth.groups.invite.invite_button_header') }}
          </BaseMenuButton>

          <BaseMenuButton :icon="Settings" @click="openActiveGroupSettings">
            {{ t('common.sidebar.admin') }}
          </BaseMenuButton>

          <BaseMenuDivider />

          <BaseMenuButton
            :icon="LogOut"
            variant="danger"
            :disabled="pending"
            @click="leaveActiveGroup"
          >
            {{ t('common.header.leave_group') }}
          </BaseMenuButton>
        </BaseMenu>
      </div>

      <div
        v-if="user && isMobile"
        class="ml-auto flex items-center gap-2 shrink-0"
      >
        <!-- TODO(search-chat): disabled until search and chat are ready.
        <BaseButton
          variant="ghost"
          on="ghost"
          :aria-label="t('common.sidebar.search')"
          :icon="Search"
          @click="openSearch"
        />
        -->

        <AccountMenu
          :email="user.email"
          :user-data="user"
          icon-only
          tooltip-placement="left"
          @logout="performLogout"
          @personalization-changed="onPersonalizationChanged"
        />
      </div>
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

@media (max-width: 384px) {
  .logo-text {
    font-size: var(--text-xl);
  }
}
@media (max-width: 352px) {
  .logo-text {
    font-size: var(--text-lg);
  }
}
@media (max-width: 320px) {
  .logo-text {
    font-size: var(--text-base);
  }
}
</style>
