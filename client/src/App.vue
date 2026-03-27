<script setup lang="ts">
import { watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/common/composables/useToast';
import { useEventListener, onKeyStroke } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { useUserStore } from './stores/userStore';
import CookieBanner from "@/common/components/CookieBanner.vue";
import BaseToast from '@/common/components/BaseToast.vue';
import AuthModal from '@/modules/auth/components/AuthModal.vue';
import GoogleLinkModal from '@/modules/auth/components/GoogleLinkModal.vue';
import MfaVerifyModal from '@/modules/auth/components/MfaVerifyModal.vue';
import { useGlobalAuthModal } from '@/core/composables/useGlobalAuthModal';
import { useSearchModal } from '@/core/composables/useSearchModal';
import SearchModal from '@/core/components/SearchModal.vue';
import ItemForm from '@/modules/tasks/components/ItemForm.vue';
import { useItemForm } from '@/core/composables/useItemForm';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { useRouter } from 'vue-router';
import hw from '@/api/hwApi';

const router = useRouter();

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const { isAuthModalOpen, openAuthModal, closeAuthModal, onAuthSuccess: handleAuthSuccess } = useGlobalAuthModal();
const { isSearchOpen, openSearch, closeSearch } = useSearchModal();
const { isItemFormOpen, itemToEdit, itemFormKey, initialType, closeItemForm, notifySuccess } = useItemForm();
const { t } = useI18n();

function onItemFormSuccess() {
  useToast().success(t('school.tasks.itemForm.successEdit'));
  notifySuccess();
}

// Global Ctrl+K / Cmd+K → Search
onKeyStroke(['k', 'K'], (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    openSearch();
  }
});

// Global N → Create new entry (only when no input/textarea/modal is focused)
onKeyStroke(['n', 'N'], (e) => {
  const tag = (e.target as HTMLElement)?.tagName?.toUpperCase();
  const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
  if (!isEditable && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    useItemForm().openItemForm();
  }
});
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

let authCheckInterval: ReturnType<typeof setInterval> | null = null;
let pageloadLogged = false;

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

watch(user, (newUser, oldUser) => {
  if (newUser && !oldUser) {
    logPageload();
  }
});

// Remove initial loader when auth is ready
watch(isAuthReady, (ready) => {
  if (ready && typeof window !== 'undefined' && window.__removeInitialLoadingScreen) {
    requestAnimationFrame(() => {
      window.__removeInitialLoadingScreen?.();
    });
  }
});

onMounted(() => {
  logPageload();

  // Handle the OAuth redirect return (?auth=success|link-required|mfa-pending|error).
  // Must run after initAuth() completes (called by router guard before mount).
  handleOAuthReturn(onAuthSuccess);

  useEventListener(window, 'show-auth-modal', handleShowAuthModal);
  useEventListener(window, 'auth-expired', handleAuthExpired);
  useEventListener(window, 'tenant-changed', handleTenantChanged);

  authCheckInterval = setInterval(() => {
    if (isAuthenticated.value) {
      checkAuthStatus();
    }
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

      <Teleport to="body">
        <AuthModal
            v-if="isAuthModalOpen"
            @cancel="closeAuthModal"
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
            @verified="() => { closeMfaModal(); onAuthSuccess(); }"
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

      <!-- Global search modal (Ctrl/Cmd+K or sidebar button) -->
      <Teleport to="body">
        <SearchModal
            v-if="isSearchOpen"
            @cancel="closeSearch"
        />
      </Teleport>

      <!-- Global item form (N key, + button, or search create action) -->
      <Teleport to="body">
        <ItemForm
            v-if="isItemFormOpen"
            :key="itemFormKey"
            :initial-type="initialType"
            :initial="itemToEdit"
            @cancel="closeItemForm"
            @success="onItemFormSuccess"
        />
      </Teleport>

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

.oauth-error-banner {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: calc(var(--z-auth-loading) - 1);
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