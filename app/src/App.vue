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

watch(user, (newUser, oldUser) => {
  if (newUser && !oldUser) logPageload();
});

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

let authCheckInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  logPageload();

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
      class="fixed top-0 left-0 right-0 h-[3px] w-full bg-transparent z-9999 pointer-events-none transition-all duration-200 ease-in-out"
      v-if="loading"
      :style="{ opacity: opacity }"
    >
      <div
        class="progress-bar h-full relative transition-[width] duration-200 ease-out"
        :style="{ width: progress + '%' }"
      ></div>
    </div>

    <template v-if="!isAuthReady">
      <div
        key="loading"
        class="fixed inset-0 flex items-center justify-center bg-canvas z-[var(--z-auth-loading)]"
      >
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
.progress-bar {
  background: var(--background-image-bismuth);
}
</style>
