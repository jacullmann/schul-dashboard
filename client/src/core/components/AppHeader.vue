<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import AppLogo from '@/common/components/AppLogo.vue';
import AccountMenu from '@/modules/auth/components/AccountMenu.vue';
import { PanelLeft, ChevronDown, Plus } from '@lucide/vue';
import hw from '@/api/hwApi';
import { useModalStore } from '@/stores/modalStore';

const userStore = useUserStore();
const { user, loading } = storeToRefs(userStore);

const {
  groupName,
  userGroups,
  activeGroupId,
  switchActiveGroup,
  logout: appAuthLogout,
} = useAppAuth();
const router = useRouter();
const route = useRoute();

const modalStore = useModalStore();
const { sidebarExpanded: isExpanded } = storeToRefs(modalStore);

function toggleExpanded() {
  modalStore.toggleSidebar();
}

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
    await appAuthLogout();
    await router.push('/');
  }
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
  <header
    class="sticky flex items-center bg-canvas text-on-surface border-b border-canvas-border font-display p-0 top-0 h-[var(--header-height)] z-[var(--z-header)]"
  >
    <div
      class="relative h-full w-full flex justify-between items-center gap-4 max-[1000px]:px-4 max-w-[1300px]"
    >
      <div class="flex items-center gap-2.5">
        <!-- On mobile the sidebar button replaces the brand logo -->
        <button
          class="md:hidden relative p-2 m-[-8px] mr-0 text-on-surface bg-transparent rounded-md hover:bg-surface transition-hover"
          @click="toggleExpanded"
          :aria-expanded="isExpanded"
          aria-label="Toggle navigation menu"
        >
          <PanelLeft :size="20" />
        </button>

        <!-- Clicking on brand links to home -->
        <!-- On desktop the brand logo is shown -->
        <router-link :to="logoLink" class="logo-group !hidden !md:block">
          <AppLogo class="logo-img" aria-hidden="true" />
        </router-link>

        <!-- If there is no active group, the brand name is shown -->
        <router-link
          :to="logoLink"
          v-if="!(activeGroupId && groupName)"
          class="logo-group"
        >
          <span class="logo-text">schul-dashboard</span>
        </router-link>

        <!-- Dropdown to switch between groups -->
        <div v-if="activeGroupId && groupName" class="relative flex items-center" ref="groupMenuRef">
          <button
            class="flex items-center gap-1 group cursor-pointer"
            @click="toggleGroupMenu"
            title="Change group"
          >
            <span class="logo-text">{{ groupName }}</span>
            <ChevronDown
              :size="16"
              class="transition-transform duration-200 ease-in-out text-on-surface-muted group-hover:text-on-surface transition-hover"
              :class="{ 'rotate-180': groupMenuOpen }"
            />
          </button>

          <BaseMenu v-if="groupMenuOpen" class="top-full mt-2 left-0">
            <BaseMenuButton
              v-for="g in userGroups"
              :key="g.id"
              :class="{ active: g.id === activeGroupId }"
              @click="onSwitchGroup(g.id)"
            >
              <span>{{ g.name }}</span>
              <span
                v-if="g.hasUnreadContent && g.id !== activeGroupId"
                class="size-2 rounded-full bg-danger shrink-0"
              ></span>
            </BaseMenuButton>

            <BaseMenuDivider />

            <BaseMenuButton
              @click="
                groupMenuOpen = false;
                router.push('/home');
              "
            >
              <Plus :size="16" />
              New group
            </BaseMenuButton>
          </BaseMenu>
        </div>
      </div>

      <div v-if="loading" class="loading-placeholder">
        <BaseSpinner on="ghost" class="size-8 max-[480px]:size-[26px]" />
      </div>
      <AccountMenu
        v-else-if="user"
        :email="user.email"
        :user-data="user"
        @logout="logout"
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
  color: var(--color-on-surface);
  flex: 0 1 auto;
  line-height: 1;
}

.logo-img {
  width: auto;
  height: 32px;
}

.logo-text {
  font-size: var(--text-h2);
  font-weight: 700;
  transition: opacity 0.2s ease;
}

.group-switcher {
  position: relative;
  display: inline-block;
  margin-left: 0.2rem;
}

.logo-group-name span {
  font-size: var(--text-body);
  font-weight: 600;
  opacity: 0.85;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 1000px) {
  .logo-img {
    height: 26px;
  }

  .logo-text {
    font-size: var(--text-h2);
  }

  .logo-text--group {
    display: inline;
  }
}

@media (max-width: 386px) {
  .logo-text {
    font-size: var(--text-h3);
  }
}

@media (max-width: 356px) {
  .logo-text {
    font-size: var(--text-title);
  }
}

@media (max-width: 332px) {
  .logo-text {
    font-size: var(--text-body);
  }
}
</style>
