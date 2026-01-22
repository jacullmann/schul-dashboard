<template>
  <header class="header">
    <div class="header-container container">
      <div class="header-left">
        <router-link to="/" class="logo-group" @click="closeNav">
          <Logo class="logo-img" aria-hidden="true" />
          <span class="logo-text">schul-dashboard</span>
        </router-link>

        <nav :class="['nav-links', { 'nav-links-open': navOpen }]">
          <button @click="closeNav" class="nav-close-button" aria-label="Menü schließen">
            <X />
          </button>

          <router-link to="/" class="nav-item" @click="closeNav">Dashboard</router-link>

          <router-link
              v-if="user?.isAdmin"
              to="/admin-dashboard"
              class="nav-item admin-link"
              @click="closeNav"
          >
            Admin
          </router-link>

          <router-link to="/stundenplan" class="nav-item" @click="closeNav">Stundenplan</router-link>
          <router-link to="/daltonraumfinder" class="nav-item" @click="closeNav">Daltonraumfinder</router-link>
          <router-link to="/kuerzel" class="nav-item" @click="closeNav">Kürzelfinder</router-link>

        </nav>
      </div>

      <div class="header-right">
        <div v-if="loading" class="loading-placeholder">
          <LoadingSpinner />
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
            v-else
            class="btn action cta-button"
            @click="openAuthModal"
            data-umami-event="Header Jetzt loslegen Button"
        >
          Anmelden
        </button>

        <button
            @click="toggleNav"
            :class="['hamburger-menu', { 'hamburger-menu--open': navOpen }]"
            aria-label="Menü öffnen oder schließen"
            v-if="!navOpen"
            data-umami-event="Mobile Menu öffnen"
        >
          <Menu style="color: var(--text)" size="26px"/>
        </button>
      </div>

      <div v-if="navOpen" class="nav-overlay" @click="closeNav"></div>
    </div>

    <CompleteSetup
        v-if="user && showSetupModal"
        :visible="showSetupModal"
        :is-setup="user && !user.doneSetup"
        :initial-data="{
          enrKurs: user.enrKurs || 0,
          wpuKurs1: user.wpuKurs1 || 0,
          wpuKurs2: user.wpuKurs2 || 0,
          theater: user.theater || 0
        }"
        @close="showSetupModal = false"
        @success="onSetupSuccess"
        @update:user="onSetupSuccess"
    />
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '../stores/userStore';
import Logo from './hw/Logo.vue';
import AccountMenu from './hw/AccountMenu.vue';
import CompleteSetup from './hw/CompleteSetup.vue';
import { X, Menu } from 'lucide-vue-next';
import hw from '../hwApi';
import LoadingSpinner from "./LoadingSpinner.vue";
import { useGlobalAuthModal } from '../composables/useGlobalAuthModal';
import { useMfa } from '../composables/useMfa';
const { resetMfaState } = useMfa();

const userStore = useUserStore();
const { user, loading, needsSetup, hasShownSetup } = storeToRefs(userStore);

const navOpen = ref(false);
const showSetupModal = ref(false);

const { openAuthModal } = useGlobalAuthModal();

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

// Auth Funktionen
async function logout() {
  try {
    await hw.post('/api/auth/logout');
  } catch (err) {
    console.error('Logout failed:', err);
  } finally {
    userStore.clearUser();
    resetMfaState();
  }
}


function onAccountDeleted() {
  userStore.clearUser();
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
  document.body.style.overflow = '';
});
</script>

<style scoped>
.header {
  background-color: var(--bg);
  color: var(--text);
  padding: var(--header-padding-y) 0;
  height: var(--header-height);
  position: sticky;
  top: 0;
  z-index: 1002;
  transition: background-color 0.3s ease;
  border-bottom: 1px solid var(--border);
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

.logo-group {
  display: flex;
  align-items: center;
  text-decoration: none;
  gap: 0.6rem;
  color: var(--text);
  flex: 0 1 auto;
  line-height: 1;
}

.logo-img {
  width: auto;
  height: 32px;
}

.logo-text {
  font-size: var(--font-size-h2);
  font-weight: 700;
  transition: opacity 0.2s ease;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  transition: all 0.2s ease;
  align-items: center;
  height: 100%;
}

.nav-item {
  font-size: var(--font-size-body);
  font-weight: 500;
  text-decoration: none;
  color: var(--text);
  position: relative;
  transition: color 0.18s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.nav-item:hover {
  color: var(--nav-hover);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  height: 100%;
}

.cta-button {
  font-size: var(--font-size-footnote);
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
  color: var(--text);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--border-4);
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
    background-color: var(--lbg);
    flex-direction: column;
    align-items: flex-start;
    padding-inline: 32px;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    z-index: 999;
    box-shadow: var(--shadow-s);
    border-left: 1px solid var(--border);
    gap: 0;
  }

  .nav-links-open {
    transform: translateX(0);
  }

  .nav-item {
    font-size: var(--font-size-h3);
    width: 100%;
    padding-block: 32px;
    border-bottom: 1px solid var(--border);
  }

  .nav-item:last-child {
    border-bottom: none;
  }

  .nav-item:hover {
    opacity: 1;
  }

  .logo-img {
    height: 26px;
  }

  .logo-text {
    font-size: var(--font-size-h2);
  }

  .header-container {
    padding-left: 16px;
    padding-right: 16px;
  }
}

@media (max-width: 386px) {
  .logo-text {
    font-size: var(--font-size-h3);
  }
}

@media (max-width: 356px) {
  .logo-text {
    font-size: var(--font-size-title);
  }
}

@media (max-width: 340px) {
  .logo-text {
    display:none;
  }
}
</style>