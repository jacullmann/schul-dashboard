<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue';
import { useEventListener } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useModalStore } from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import GlobalModalContainer from '@/core/components/GlobalModalContainer.vue';
import CookieBanner from '@/common/components/CookieBanner.vue';
import BaseToast from '@/common/components/BaseToast.vue';
import hw from '@/api/hwApi';

const router = useRouter();
const userStore = useUserStore();
const modalStore = useModalStore();
const { user } = storeToRefs(userStore);
const { isAuthenticated, isAuthReady, checkAuthStatus } = useAppAuth();
const { handleOAuthReturn } = useOAuth();

// ── Auth lifecycle helpers ─────────────────────────────────────────────────

let pageloadLogged = false;

function logPageload() {
  if (pageloadLogged || !user.value) return;
  pageloadLogged = true;
  hw.post('/api/user/activity/pageload').catch(() => {
    pageloadLogged = false;
  });
}

function handleShowAuthModal() {
  modalStore.openAuthModal().catch(() => {});
}

async function handleAuthExpired() {
  userStore.clearUser();
  const stillAuthenticated = await checkAuthStatus();
  if (stillAuthenticated) {
    modalStore.openAuthModal().catch(() => {});
  } else {
    const currentPath = router.currentRoute.value.path;
    if (currentPath !== '/' && !currentPath.startsWith('/auth')) {
      await router.push('/');
    }
  }
}

async function handleTenantChanged() {
  await userStore.fetchUser();
}

// ── Watchers ──────────────────────────────────────────────────────────────

watch(user, (newUser, oldUser) => {
  if (newUser && !oldUser) logPageload();
});

// Remove initial loading screen once auth state is resolved
watch(isAuthReady, (ready) => {
  if (ready && typeof window !== 'undefined' && window.__removeInitialLoadingScreen) {
    requestAnimationFrame(() => {
      window.__removeInitialLoadingScreen?.();
    });
  }
});

// ── Lifecycle ─────────────────────────────────────────────────────────────

let authCheckInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  logPageload();

  // Handle OAuth redirect (?auth=success|link-required|mfa-pending|error).
  // Must run after initAuth() which is called by the router guard before mount.
  handleOAuthReturn(async () => {
    await userStore.fetchUser();
    modalStore.resolveAuthModal('');
  });

  useEventListener(window, 'show-auth-modal', handleShowAuthModal);
  useEventListener(window, 'auth-expired', handleAuthExpired);
  useEventListener(window, 'tenant-changed', handleTenantChanged);

  authCheckInterval = setInterval(() => {
    if (isAuthenticated.value) checkAuthStatus();
  }, 5 * 60 * 1000);
});

onUnmounted(() => {
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
});
</script>

<template>
  <div class="full">
    <template v-if="!isAuthReady">
      <div key="loading" class="auth-loading-screen">
        <BaseSpinner on="ghost" size="40px" />
      </div>
    </template>

    <template v-else key="content">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>

      <!-- All globally-managed modals live here -->
      <GlobalModalContainer />

      <CookieBanner />
      <BaseToast />
    </template>
  </div>
</template>

<style scoped>
.auth-loading-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-canvas);
  z-index: var(--z-auth-loading);
}
</style>