<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import AppLogo from '@/common/components/AppLogo.vue';
import AccountMenu from '@/modules/auth/components/AccountMenu.vue';
import CompleteSetup from '@/modules/auth/components/CompleteSetup.vue';
import { X, Menu, ChevronDown } from 'lucide-vue-next';
import hw from '@/api/hwApi';
import { useMfa } from '@/modules/auth/composables/useMfa';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { resetMfaState } = useMfa();

const userStore = useUserStore();
const { user, loading, needsSetup, hasShownSetup, isGroupAdmin } = storeToRefs(userStore);

const { groupName, userGroups, activeGroupId, switchActiveGroup, logout: appAuthLogout } = useAppAuth();
const router = useRouter();
const route = useRoute();

const navOpen = ref(false);
const showSetupModal = ref(false);
const groupMenuOpen = ref(false);
const groupMenuRef = ref<HTMLElement | null>(null);

// Logo links to active group items if active group exists, otherwise home
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
        const newPath = route.path.replace(`/groups/${oldGroupId}`, `/groups/${id}`);
        await router.push(newPath);
        
        // If the guard redirected us to /home (e.g. missing permissions), fall back to items/all
        if (route.path === '/home') {
          await router.push(`/groups/${id}/items/all`);
        }
      } else {
        await router.push(`/groups/${id}/items/all`);
      }
    } else {
      console.error("Failed to switch group", res.error);
    }
  }
}

function handleClickOutside(event: MouseEvent) {
  if (groupMenuOpen.value && groupMenuRef.value && !groupMenuRef.value.contains(event.target as Node)) {
    groupMenuOpen.value = false;
  }
}

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

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
  document.addEventListener('click', handleClickOutside);
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
  document.removeEventListener('keydown', handleEscape);
  document.removeEventListener('click', handleClickOutside);
  document.body.style.overflow = '';
});
</script>

<template>
  <header class="header">
    <div class="header-container container">
      <div class="header-left">
        <div class="logo-group-container">
          <!-- Logo always links to home or active group -->
          <router-link :to="logoLink" class="logo-group" @click="closeNav">
            <AppLogo class="logo-img" aria-hidden="true" />
            <span v-if="activeGroupId && groupName" class="logo-text logo-text--group">{{ groupName }}</span>
            <span v-else class="logo-text logo-text--brand">schul-dashboard</span>
          </router-link>

          <!-- Group switcher: only visible when a group is active -->
          <template v-if="activeGroupId && groupName">
            <span class="logo-separator--desktop" aria-hidden="true">/</span>

            <div class="group-switcher" ref="groupMenuRef">
              <button
                  class="group-switcher-btn logo-group-name--desktop"
                  @click="toggleGroupMenu"
                  title="Change group"
              >
                <span>{{ groupName }}</span>
                <ChevronDown :size="16" class="chevron" :class="{ 'chevron-open': groupMenuOpen }" />
              </button>

              <div v-if="groupMenuOpen" class="menu">
                <button
                    v-for="g in userGroups"
                    :key="g.id"
                    class="menu-btn"
                    :class="{ active: g.id === activeGroupId }"
                    @click="onSwitchGroup(g.id)"
                >
                  <span>{{ g.name }}</span>
                  <span v-if="g.hasUnreadContent && g.id !== activeGroupId" class="unread-dot"></span>
                </button>
                <div class="menu-divider"></div>
                <router-link
                    to="/home"
                    class="menu-btn action"
                    @click="groupMenuOpen = false"
                >
                  + New group
                </router-link>
              </div>
            </div>
          </template>
        </div>

        <nav :class="['nav-links', { 'nav-links-open': navOpen }]">
          <button @click="closeNav" class="nav-close-button" aria-label="Close menu">
            <X />
          </button>

          <!-- Group navigation: visible when a group is active -->
          <template v-if="activeGroupId">
            <router-link :to="`/groups/${activeGroupId}/items/all`" class="nav-item" @click="closeNav">{{ t('school.tasks.title') }}</router-link>
            <router-link :to="`/groups/${activeGroupId}/schedule`" class="nav-item" @click="closeNav">{{ t('school.tables.schedule.title') }}</router-link>
          </template>

          <!-- User navigation: always visible -->
          <router-link to="/todos" class="nav-item" @click="closeNav" v-if="user">Private Todos</router-link>

          <!-- Admin links -->
          <router-link
              v-if="user?.role === 'superadmin'"
              to="/admin"
              class="nav-item admin-link"
              @click="closeNav"
          >
            Superadmin Dashboard
          </router-link>
          <router-link
              v-if="activeGroupId && isGroupAdmin"
              :to="`/groups/${activeGroupId}/admin`"
              class="nav-item"
              @click="closeNav"
          >
            Manage Group
          </router-link>
        </nav>
      </div>

      <div class="header-right">
        <div v-if="loading" class="loading-placeholder">
          <BaseSpinner on="ghost" class="size-8 max-[480px]:size-[26px]" />
        </div>
        <AccountMenu
            v-else-if="user"
            :email="user.email"
            :user-data="user"
            @deleted="onAccountDeleted"
            @error="onAccountDeleteError"
            @open-setup="openSetupModal"
            @logout="logout"
            @personalization-changed="onPersonalizationChanged"
            @mfa-changed="onMfaChanged"
        />

        <button
            @click="toggleNav"
            :class="['hamburger-menu', { 'hamburger-menu--open': navOpen }]"
            aria-label="Toggle menu"
            v-if="!navOpen"
        >
          <Menu style="color: var(--color-on-surface)" :size="26"></Menu>
        </button>
      </div>

      <div v-if="navOpen" class="nav-overlay" @click="closeNav"></div>
    </div>

    <CompleteSetup
        v-if="user && showSetupModal"
        :visible="showSetupModal"
        :is-setup="user && !user.doneSetup"
        :initial-data="{
          enrKurs: user.enrKurs || null,
          wpuKurs1: user.wpuKurs1 || null,
          wpuKurs2: user.wpuKurs2 || null,
          theater: user.theater || 0
        }"
        @close="showSetupModal = false"
        @success="onSetupSuccess"
        @update:user="onSetupSuccess"
    />
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
  z-index: 1002;
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
  gap: 0.2rem;
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

.logo-text--group {
  display: none;
}

.logo-text--brand {
  display: inline;
}

.logo-separator--desktop {
  font-size: var(--text-body);
  font-weight: 400;
  color: var(--color-on-surface);
  opacity: 0.4;
  margin: 0 0.2rem;
  user-select: none;
}

.group-switcher {
  position: relative;
  display: inline-block;
  margin-left: 0.2rem;
}

.group-switcher-btn {
  background: transparent;
  border: none;
  display: flex;
  cursor: pointer;
  align-items: center;
  gap: 4px;
  color: var(--color-on-surface);
  padding: 4px 8px;
  border-radius: var(--radius-md);
  transition: background-color 0.2s ease;
}

.group-switcher-btn:hover {
  background: var(--color-surface-hover);
}

.logo-group-name--desktop span {
  font-size: var(--text-body);
  font-weight: 600;
  opacity: 0.85;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  transition: transform 0.2s ease;
  opacity: 0.7;
}

.chevron-open {
  transform: rotate(180deg);
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  transition: all 0.2s ease;
  align-items: center;
  height: 100%;
}

.nav-item {
  font-size: var(--text-body);
  font-weight: 500;
  text-decoration: none;
  color: var(--color-on-surface);
  position: relative;
  transition: color 0.18s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.nav-item:hover {
  color: var(--color-action-hover);
}

.unread-dot {
  width: 8px;
  height: 8px;
  background-color: var(--color-danger);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  height: 100%;
}

.cta-button {
  font-size: var(--text-footnote);
  padding: 8px;
}

.hamburger-menu {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 1010;
  position: relative;
  padding: 0;
}

.nav-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 998;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.nav-close-button {
  display: none;
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: var(--color-on-surface);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  transition: background-color 0.3s ease;
  z-index: 1002;
}

.nav-close-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

@media (max-width: 1000px) {
  .header-right {
    gap: 1rem;
  }

  .hamburger-menu {
    display: flex;
  }

  .nav-close-button {
    display: block;
  }

  .nav-links {
    position: fixed;
    top: 0;
    right: 0;
    width: 240px;
    height: 100%;
    background-color: var(--color-canvas);
    flex-direction: column;
    align-items: flex-start;
    padding-inline: 32px;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    z-index: 999;
    box-shadow: var(--shadow-menu);
    border-left: 1px solid var(--color-canvas-border);
    gap: 0;
  }

  .nav-links-open {
    transform: translateX(0);
  }

  .nav-item {
    font-size: var(--text-h3);
    width: 100%;
    padding-block: 32px;
    border-bottom: 1px solid var(--color-canvas-border);
  }

  .nav-item:last-child {
    border-bottom: none;
  }

  .logo-img {
    height: 26px;
  }

  .logo-text {
    font-size: var(--text-h2);
  }

  .logo-text--group {
    display: inline;
  }

  .logo-text--brand {
    display: none;
  }

  .header-container {
    padding-left: 16px;
    padding-right: 16px;
  }

  .logo-separator--desktop,
  .logo-group-name--desktop {
    display: none;
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
