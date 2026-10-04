<script setup lang="ts">
import { watch, onMounted } from 'vue';
import { useEventListener } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { useLoadingBar } from '@/common/composables/loadingState';
import GlobalModalContainer from '@/core/components/GlobalModalContainer.vue';
import BaseToast from '@/common/components/BaseToast.vue';
import ConnectionStatus from '@/core/components/ConnectionStatus.vue';
import api from './api/api';

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { isAuthReady, checkAuthStatus } = useAppAuth();
const { handleOAuthReturn } = useOAuth();
const { loading, progress, opacity } = useLoadingBar();

let pageloadLogged = false;

function logPageload() {
  if (pageloadLogged || !user.value) return;
  pageloadLogged = true;
  api.post('/user/activity/pageload').catch(() => {
    pageloadLogged = false;
  });
}

async function handleAuthExpired() {
  userStore.clearUser();
  if (!router.currentRoute.value.meta.access) {
    await router.push({ name: 'login' });
  }
}

watch(user, (newUser, oldUser) => {
  if (newUser && !oldUser) logPageload();
});

// index.html paints this screen before the bundle loads; App shows its own
// spinner from here on.
function removeInitialLoadingScreen() {
  document.getElementById('initial-loading-screen')?.remove();
}

watch(
  isAuthReady,
  (ready) => {
    if (ready) requestAnimationFrame(removeInitialLoadingScreen);
  },
  { immediate: true },
);

onMounted(() => {
  logPageload();

  handleOAuthReturn(async () => {
    await checkAuthStatus();
    await userStore.fetchUser();
  });

  useEventListener(window, 'auth-expired', () => void handleAuthExpired());
});
</script>

<template>
  <div class="full">
    <div
      v-if="loading"
      class="fixed top-0 left-0 right-0 h-[3px] w-full bg-transparent z-9999 pointer-events-none transition-all duration-200 ease-in-out"
      :style="{ opacity: opacity }"
    >
      <div
        class="h-full relative bg-accent transition-[width] duration-200 ease-out"
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

    <template v-else>
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>

      <GlobalModalContainer />
      <BaseToast />
    </template>

    <ConnectionStatus />
  </div>
</template>
