<template>
  <div class="full">
    <template v-if="!isAuthReady">
      <div class="auth-loading-screen">
        <div class="auth-loading-spinner"></div>
      </div>
    </template>
    <template v-else>
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>

      <Teleport to="body">
        <AuthModal
            v-if="isAuthModalOpen"
            @close="closeAuthModal"
            @logged-in="onAuthSuccess"
        />
      </Teleport>

      <CookieBanner />
    </template>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from './stores/userStore';
import CookieBanner from "@/common/components/CookieBanner.vue";
import AuthModal from '@/modules/auth/components/AuthModal.vue';
import { useGlobalAuthModal } from '@/core/composables/useGlobalAuthModal';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useRouter } from 'vue-router';
import hw, { syncCsrfFromCookie } from '@/api/hwApi';

const router = useRouter();

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const { isAuthModalOpen, openAuthModal, closeAuthModal, onAuthSuccess: handleAuthSuccess } = useGlobalAuthModal();
const { isAuthenticated, isAuthReady, checkAuthStatus } = useAppAuth();

let authCheckInterval: ReturnType<typeof setInterval> | null = null;
let pageloadLogged = false;
let csrfRedirectInProgress = false;

function logPageload() {
  if (pageloadLogged || !user.value) return;
  pageloadLogged = true;
  hw.post('/api/user/activity/pageload').catch(() => {
    pageloadLogged = false;
  });
}

function handleShowAuthModal() {
  openAuthModal().catch(() => {});
}
async function onAuthSuccess() {
  syncCsrfFromCookie();
  await userStore.fetchUser();
  handleAuthSuccess('');
  await nextTick();
}

async function handleAuthExpired() {
  userStore.clearUser();

  const stillAuthenticated = await checkAuthStatus();

  if (stillAuthenticated) {
    openAuthModal().catch(() => {});
  } else {
    const currentPath = router.currentRoute.value.path;
    if (!currentPath.startsWith('/welcome')) {
      await router.push('/welcome');
    }
  }
}
function handleCsrfRefreshFailed() {
  if (csrfRedirectInProgress) return;
  csrfRedirectInProgress = true;

  console.error('CSRF refresh failed - redirecting to welcome');

  setTimeout(() => {
    const currentPath = router.currentRoute.value.path;
    if (!currentPath.startsWith('/welcome')) {
      router.push('/welcome').finally(() => {
        setTimeout(() => {
          csrfRedirectInProgress = false;
        }, 1000);
      });
    } else {
      setTimeout(() => {
        csrfRedirectInProgress = false;
      }, 1000);
    }
  }, 100);
}

function handleCsrfInitFailed() {
  console.error('CSRF-Initialisierung fehlgeschlagen. Reload-Confirm anzeigen.');
  const shouldReload = confirm(
      'Die Verbindung zum Server konnte nicht sicher hergestellt werden. ' +
      'Seite neu laden?'
  );
  if (shouldReload) {
    window.location.reload();
  }
}

watch(user, (newUser, oldUser) => {
  if (newUser && !oldUser) {
    logPageload();
  }
});

onMounted(() => {
  logPageload();

  window.addEventListener('show-auth-modal', handleShowAuthModal);
  window.addEventListener('auth-expired', handleAuthExpired);
  window.addEventListener('csrf-refresh-failed', handleCsrfRefreshFailed);
  window.addEventListener('csrf-init-failed', handleCsrfInitFailed);

  authCheckInterval = setInterval(() => {
    if (isAuthenticated.value) {
      checkAuthStatus();
    }
  }, 5 * 60 * 1000);
});

onUnmounted(() => {
  window.removeEventListener('show-auth-modal', handleShowAuthModal);
  window.removeEventListener('auth-expired', handleAuthExpired);
  window.removeEventListener('csrf-refresh-failed', handleCsrfRefreshFailed);
  window.removeEventListener('csrf-init-failed', handleCsrfInitFailed);

  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
});
</script>
<style scoped>
.auth-loading-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  z-index: 10000;
}

.auth-loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--text);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>