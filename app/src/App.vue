<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue';
import { useEventListener } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { useLoadingBar } from '@/common/composables/loadingState';
import GlobalModalContainer from '@/core/components/GlobalModalContainer.vue';
import BaseToast from '@/common/components/BaseToast.vue';
import hw from '@/api/hwApi';

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { isAuthenticated, isAuthReady, checkAuthStatus } = useAppAuth();
const { handleOAuthReturn } = useOAuth();
const { loading, progress, opacity } = useLoadingBar();

// ── Auth lifecycle helpers ─────────────────────────────────────────────────

let pageloadLogged = false;

function logPageload() {
  if (pageloadLogged || !user.value) return;
  pageloadLogged = true;
  hw.post('/api/user/activity/pageload').catch(() => {
    pageloadLogged = false;
  });
}

async function handleAuthExpired() {
  userStore.clearUser();
  const stillAuthenticated = await checkAuthStatus();
  if (stillAuthenticated) {
    await router.push('/login');
  } else {
    const currentPath = router.currentRoute.value.path;
    if (
      currentPath !== '/' &&
      !currentPath.startsWith('/login') &&
      !currentPath.startsWith('/auth') &&
      !currentPath.startsWith('/verify')
    ) {
      await router.push('/login');
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
watch(
  isAuthReady,
  (ready) => {
    if (
      ready &&
      typeof window !== 'undefined' &&
      window.__removeInitialLoadingScreen
    ) {
      requestAnimationFrame(() => {
        window.__removeInitialLoadingScreen?.();
      });
    }
  },
  { immediate: true },
);

// ── Lifecycle ─────────────────────────────────────────────────────────────

let authCheckInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  logPageload();

  // Handle OAuth redirect (?auth=success|link-required|mfa-pending|error).
  // Must run after initAuth() which is called by the router guard before mount.
  handleOAuthReturn(async () => {
    await checkAuthStatus();
    await userStore.fetchUser();
  });

  useEventListener(window, 'auth-expired', handleAuthExpired);
  useEventListener(window, 'tenant-changed', handleTenantChanged);

  authCheckInterval = setInterval(
    () => {
      if (isAuthenticated.value) checkAuthStatus();
    },
    5 * 60 * 1000,
  );
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
    <div
      class="progress-container"
      v-if="loading"
      :style="{ opacity: opacity }"
    >
      <div class="progress-bar" :style="{ width: progress + '%' }">
        <div class="peg"></div>
      </div>
    </div>

    <template v-if="!isAuthReady">
      <div key="loading" class="auth-loading-screen">
        <BaseSpinner on="ghost" size="40px" />
      </div>
    </template>

    <template v-else key="content">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>

      <GlobalModalContainer />
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

.progress-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  width: 100%;
  background: transparent;
  z-index: 9999;
  pointer-events: none;
  transition: all 0.2s ease;
}

.progress-bar {
  height: 100%;
  background: var(--background-image-bismuth);
  transition: width 200ms ease-out;
  position: relative;
}

.peg {
  display: block;
  position: absolute;
  right: 0;
  width: 100px;
  height: 100%;
  box-shadow:
    0 0 10px var(--color-bismuth-purple),
    0 0 5px var(--color-bismuth-purple);
  opacity: 1;
  transform: rotate(3deg) translate(0px, -4px);
}

@keyframes peg-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
