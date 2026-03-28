<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import AppLogo from '@/common/components/AppLogo.vue';
import AccountMenu from '@/modules/auth/components/AccountMenu.vue';
import { ChevronDown, Plus } from '@lucide/vue';
import hw from '@/api/hwApi';

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
  <header class="header">
    <div class="header-container container">
      <div class="header-left">
        <div class="logo-group-container">
          <!-- Logo always links to home or active group -->
          <router-link :to="logoLink" class="logo-group">
            <AppLogo class="logo-img" aria-hidden="true" />
            <!-- If there is no active group, the brand name is shown -->
            <span v-if="!(activeGroupId && groupName)" class="logo-text"
              >schul-dashboard</span
            >
          </router-link>

          <!-- Dropdown to switch between groups -->
          <template v-if="activeGroupId && groupName">
            <div class="group-switcher" ref="groupMenuRef">
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

              <BaseMenu v-if="groupMenuOpen">
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
          </template>
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
.header {
  background-color: var(--color-canvas);
  color: var(--color-on-surface);
  padding: 0;
  height: var(--header-height);
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  transition: background-color 0.3s ease;
  border-bottom: 1px solid var(--color-canvas-border);
  font-family: 'Satoshi', sans-serif;
  display: flex;
  align-items: center;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  position: relative;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
  height: 100%;
}

.container {
  max-width: 1300px;
}

.logo-group-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

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

  .header-container {
    padding-left: 16px;
    padding-right: 16px;
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
