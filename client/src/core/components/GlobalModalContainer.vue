<script setup lang="ts">
/**
 * GlobalModalContainer
 *
 * Single place in the component tree that owns all globally-managed modals.
 * It reads state from the modal store and renders each modal via a dedicated
 * <Teleport to="body"> so they escape any overflow/stacking constraints.
 *
 * Business logic (logout, callbacks, etc.) lives here rather than in App.vue
 * so App.vue can stay purely focused on app-lifecycle concerns.
 */
import { nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useToast } from '@/common/composables/useToast';
import { storeToRefs } from 'pinia';
import { useModalStore } from '@/stores/modalStore';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { useMfa } from '@/modules/auth/composables/useMfa';
import hw from '@/api/hwApi';

import AuthModal from '@/modules/auth/components/AuthModal.vue';
import GoogleLinkModal from '@/modules/auth/components/GoogleLinkModal.vue';
import MfaVerifyModal from '@/modules/auth/components/MfaVerifyModal.vue';
import SearchModal from '@/core/components/SearchModal.vue';
import ItemForm from '@/modules/tasks/components/ItemForm.vue';
import ChangePasswordModal from '@/modules/auth/components/ChangePasswordModal.vue';
import SecurityModal from '@/modules/auth/components/SecurityModal.vue';
import DeleteAccountModal from '@/modules/auth/components/DeleteAccountModal.vue';
import CompleteSetup from '@/modules/auth/components/CompleteSetup.vue';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();

// Store instances — actions are called directly on the store object;
// only reactive state properties are extracted via storeToRefs.
const modalStore = useModalStore();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { logout: appAuthLogout } = useAppAuth();
const { resetMfaState } = useMfa();
const {
  showLinkModal,
  showMfaModal,
  oauthError,
  closeLinkModal,
  closeMfaModal,
  clearOAuthError,
} = useOAuth();

// State refs (storeToRefs preserves reactivity for template bindings).
// Note: actions cannot be extracted via storeToRefs — use modalStore.action() directly.
const {
  authModalOpen,
  searchOpen,
  itemFormOpen,
  itemFormKey,
  itemToEdit,
  itemFormInitialType,
  showChangePassword,
  showSecurity,
  showSetup,
  showDeleteAccount,
} = storeToRefs(modalStore);

// ── Auth modal callbacks ───────────────────────────────────────────────────

async function onAuthSuccess() {
  await userStore.fetchUser();
  modalStore.resolveAuthModal('');
  await nextTick();
}

// ── Item form callbacks ────────────────────────────────────────────────────

function onItemFormSuccess() {
  toast.success(t('school.tasks.itemForm.successEdit'));
  modalStore.notifyItemFormSuccess();
}

// ── Account modal callbacks ────────────────────────────────────────────────

function onPasswordChanged() {
  toast.success('Passwort erfolgreich geändert!');
  modalStore.showChangePassword = false;
}

function onMfaChanged(enabled: boolean) {
  userStore.setMfaEnabled(enabled);
}

function onSetupSuccess(updatedUser: any) {
  userStore.updateUser({ personalized: updatedUser?.personalized ?? true });
  modalStore.showSetup = false;
}

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
  await logout();
  modalStore.showDeleteAccount = false;
}

function onAccountDeleteError(msg: string) {
  toast.error(msg);
}
</script>

<template>
  <!-- Auth modal -->
  <Teleport to="body">
    <AuthModal
      v-if="authModalOpen"
      @cancel="modalStore.closeAuthModal()"
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

  <!-- OAuth: MFA overlay (shown after ?auth=mfa-pending) -->
  <Teleport to="body">
    <MfaVerifyModal
      v-if="showMfaModal"
      @verified="
        () => {
          closeMfaModal();
          onAuthSuccess();
        }
      "
      @cancelled="closeMfaModal"
    />
  </Teleport>

  <!-- OAuth: error banner (shown after ?auth=error) -->
  <Teleport to="body">
    <Transition name="fade-down">
      <div v-if="oauthError" class="oauth-error-banner" role="alert">
        <span>{{ oauthError }}</span>
        <button
          class="oauth-error-close"
          @click="clearOAuthError"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>
    </Transition>
  </Teleport>

  <!-- Global search modal (Ctrl/Cmd+K or sidebar button) -->
  <Teleport to="body">
    <SearchModal v-if="searchOpen" @cancel="modalStore.closeSearch()" />
  </Teleport>

  <!-- Global item form (N key, + button, or search create action) -->
  <Teleport to="body">
    <ItemForm
      v-if="itemFormOpen"
      :key="itemFormKey"
      :initial-type="itemFormInitialType"
      :initial="itemToEdit"
      @cancel="modalStore.closeItemForm()"
      @success="onItemFormSuccess"
    />
  </Teleport>

  <!-- Account modals -->
  <Teleport to="body">
    <ChangePasswordModal
      v-if="showChangePassword"
      @cancel="modalStore.showChangePassword = false"
      @success="onPasswordChanged"
    />

    <SecurityModal
      v-if="showSecurity"
      :initial-mfa-enabled="user?.mfaEnabled"
      @cancel="modalStore.showSecurity = false"
      @mfa-changed="onMfaChanged"
    />

    <DeleteAccountModal
      v-if="showDeleteAccount"
      :email="user?.email || ''"
      @cancel="modalStore.showDeleteAccount = false"
      @deleted="onAccountDeleted"
      @error="onAccountDeleteError"
    />

    <CompleteSetup
      v-if="showSetup && user"
      :visible="showSetup"
      :is-setup="!user.doneSetup"
      :initial-data="{
        enrKurs: user.enrKurs || null,
        wpuKurs1: user.wpuKurs1 || null,
        wpuKurs2: user.wpuKurs2 || null,
        theater: user.theater || 0,
      }"
      @cancel="modalStore.showSetup = false"
      @success="modalStore.showSetup = false"
      @update:user="onSetupSuccess"
    />
  </Teleport>
</template>

<style scoped>
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
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
