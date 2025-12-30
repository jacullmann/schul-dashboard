<template>
  <div class="full">
    <template v-if="!isAuthReady">
      <div class="auth-loading-screen">
        <div class="auth-loading-spinner"></div>
      </div>
    </template>
    <template v-else>
      <Header v-if="!$route.meta.hideNavigation"/>
      <GlobalAnnouncements />

      <div class="progress-container" v-if="loading" :style="{ opacity: opacity }">
        <div class="progress-bar" :style="{ width: progress + '%' }">
          <div class="peg"></div>
        </div>
      </div>

      <main class="full-c">
        <div class="svg-background" v-if="deviceIsMobile"></div>
        <div class="black-bg" v-else></div>

        <div
            :class="{ 'container': !$route.meta.fullWidth }"
            class="main-content"
            key="content"
        >
          <router-view v-slot="{ Component }">
            <component :is="Component" />
          </router-view>
        </div>
      </main>

      <Footer v-if="!$route.meta.hideNavigation"/>
      <AuthModal
          v-if="isAuthModalOpen"
          @close="closeAuthModal"
          @logged-in="onAuthSuccess"
      />

      <CookieBanner />
      <AccountPromoPopup v-if="!$route.meta.hideNavigation" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from './stores/userStore';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import CookieBanner from "./components/CookieBanner.vue";
import GlobalAnnouncements from './components/GlobalAnnouncements.vue';
import AccountPromoPopup from './components/popups/AuthFeatures.vue';
import { loadBadWords } from "./composables/useProfanity";
import { useLoadingBar } from "./composables/loadingState";
import AuthModal from './components/hw/AuthModal.vue';
import { useGlobalAuthModal } from './composables/useGlobalAuthModal';
import { useAppAuth } from './composables/useAppAuth';
import { useRouter, useRoute } from 'vue-router';
import hw from './hwApi';

const router = useRouter();
const route = useRoute();

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const { isAuthModalOpen, openAuthModal, closeAuthModal, onAuthSuccess: handleAuthSuccess } = useGlobalAuthModal();
const { isAuthenticated, isAuthReady, checkAuthStatus } = useAppAuth();

const deviceIsMobile = ref(false);
let authCheckInterval: ReturnType<typeof setInterval> | null = null;
let pageloadLogged = false;

const { loading, progress, opacity } = useLoadingBar();

const checkIfMobile = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isSmallScreen = window.innerWidth <= 768;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  deviceIsMobile.value = isMobileUserAgent || (isSmallScreen && isTouchDevice);
};

function logPageload() {
  if (pageloadLogged || !user.value) return;
  pageloadLogged = true;
  hw.post('/api/activity/pageload').catch(() => {
    pageloadLogged = false;
  });
}

function handleShowAuthModal() {
  openAuthModal().catch(() => {});
}
function handleAppGateExpired() {
  router.push('/welcome');
}
async function onAuthSuccess() {
  await userStore.fetchUser();
  handleAuthSuccess('');
}
function handleUserTokenExpired() {
  userStore.clearUser();
  openAuthModal().catch(() => {});
}
function handleCsrfRefreshFailed() {
  console.error('CSRF refresh failed - redirecting to welcome');
  router.push('/welcome');
}

watch(user, (newUser, oldUser) => {
  if (newUser && !oldUser) {
    logPageload();
  }
});

onMounted(() => {
  checkIfMobile();
  loadBadWords();
  logPageload();

  window.addEventListener('show-auth-modal', handleShowAuthModal);
  window.addEventListener('user-token-expired', handleUserTokenExpired);
  window.addEventListener('app-gate-expired', handleAppGateExpired);
  window.addEventListener('csrf-refresh-failed', handleCsrfRefreshFailed);

  authCheckInterval = setInterval(() => {
    if (isAuthenticated.value) {
      checkAuthStatus();
    }
  }, 5 * 60 * 1000);
});

onUnmounted(() => {
  window.removeEventListener('show-auth-modal', handleShowAuthModal);
  window.removeEventListener('user-token-expired', handleUserTokenExpired);
  window.removeEventListener('app-gate-expired', handleAppGateExpired);
  window.removeEventListener('csrf-refresh-failed', handleCsrfRefreshFailed);

  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
});
</script>
<style scoped>
.progress-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  z-index: 10000;
  pointer-events: none;
  transition: opacity 0.4s ease;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ffa91a 0, #ff335a 35%, #af00ff 70%, #5600ff 110%);
  width: 0;
  transition: width 200ms ease-out;
  position: relative;
}

.peg {
  display: block;
  position: absolute;
  right: 0;
  width: 100px;
  height: 100%;
  box-shadow: 0 0 10px #af00ff, 0 0 5px #af00ff;
  opacity: 1;
  transform: rotate(3deg) translate(0px, -4px);
}

.full-c {
  flex: 1;
  position: relative;
}
.main-content {
  margin-top: var(--announcement-height);
  transition: margin-top 0.3s ease;
  width: 100%;
}

.black-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--bg);
  z-index: -2;
}
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

