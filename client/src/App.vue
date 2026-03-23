<script setup lang="ts">
import { watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from './stores/userStore';
import CookieBanner from "@/common/components/CookieBanner.vue";
import ToastContainer from '@/common/components/ToastContainer.vue';
import AuthModal from '@/modules/auth/components/AuthModal.vue';
import GoogleLinkModal from '@/modules/auth/components/GoogleLinkModal.vue';
import MfaVerifyModal from '@/modules/auth/components/MfaVerifyModal.vue';
import { useGlobalAuthModal } from '@/core/composables/useGlobalAuthModal';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { useRouter } from 'vue-router';
import hw, { syncCsrfFromCookie, setCsrfToken } from '@/api/hwApi';
import { useRoute } from 'vue-router';

const router = useRouter();

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const { isAuthModalOpen, openAuthModal, closeAuthModal, onAuthSuccess: handleAuthSuccess } = useGlobalAuthModal();
const { isAuthenticated, isAuthReady, checkAuthStatus } = useAppAuth();
const {
  showLinkModal,
  showMfaModal,
  oauthError,
  handleOAuthReturn,
  closeLinkModal,
  closeMfaModal,
  clearOAuthError,
} = useOAuth();
const route = useRoute();
const isPublicRoute = computed(() =>
    route.path === '/' || route.path === '/auth' || route.path === '/legal'
);

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
    if (currentPath !== '/' && !currentPath.startsWith('/auth')) {
      await router.push('/');
    }
  }
}

async function handleTenantChanged() {
  await userStore.fetchUser();
}
function handleCsrfRefreshFailed() {
  if (csrfRedirectInProgress) return;
  csrfRedirectInProgress = true;

  console.error('CSRF refresh failed - redirecting to welcome');

  setTimeout(() => {
    const currentPath = router.currentRoute.value.path;
    if (currentPath !== '/' && !currentPath.startsWith('/auth')) {
      router.push('/').finally(() => {
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
  console.error('CSRF initialization failed.');
  const shouldReload = confirm(
      'A secure connection to the server could not be established. ' +
      'Reload page?'
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

  // Handle the OAuth redirect return (?auth=success|link-required|mfa-pending|error).
  // Must run after initAuth() completes (called by router guard before mount).
  handleOAuthReturn(onAuthSuccess);

  window.addEventListener('show-auth-modal', handleShowAuthModal);
  window.addEventListener('auth-expired', handleAuthExpired);
  window.addEventListener('tenant-changed', handleTenantChanged);
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
  window.removeEventListener('tenant-changed', handleTenantChanged);
  window.removeEventListener('csrf-refresh-failed', handleCsrfRefreshFailed);
  window.removeEventListener('csrf-init-failed', handleCsrfInitFailed);

  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
});
</script>

<template>
  <div class="full">
    <template v-if="!isAuthReady && !isPublicRoute">
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

      <!-- OAuth: account-linking modal (shown after ?auth=link-required) -->
      <Teleport to="body">
        <GoogleLinkModal
            v-if="showLinkModal"
            @linked="onAuthSuccess"
            @cancel="closeLinkModal"
        />
      </Teleport>

      <!-- OAuth: MFA overlay (shown after ?auth=mfa-pending, i.e. Google login + MFA enabled) -->
      <Teleport to="body">
        <MfaVerifyModal
            v-if="showMfaModal"
            @verified="(csrfToken) => { if (csrfToken) setCsrfToken(csrfToken); closeMfaModal(); onAuthSuccess(); }"
            @cancelled="closeMfaModal"
        />
      </Teleport>

      <!-- OAuth: error banner (shown after ?auth=error) -->
      <Teleport to="body">
        <Transition name="fade-down">
          <div v-if="oauthError" class="oauth-error-banner" role="alert">
            <span>{{ oauthError }}</span>
            <button class="oauth-error-close" @click="clearOAuthError" aria-label="Schließen">✕</button>
          </div>
        </Transition>
      </Teleport>

      <CookieBanner />
      <ToastContainer />
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
  z-index: 10000;
}

.auth-loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-canvas-border);
  border-top-color: var(--color-on-surface);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.oauth-error-banner {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-danger-surface);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-lg);
  padding: 10px 16px;
  font-size: var(--text-sub);
  box-shadow: var(--shadow-menu);
  white-space: nowrap;
}

.oauth-error-close {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 14px;
  padding: 0;
  line-height: 1;
}

.fade-down-enter-active,
.fade-down-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>