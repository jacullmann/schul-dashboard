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


import GoogleLinkModal from '@/modules/auth/components/GoogleLinkModal.vue';
import MfaVerifyModal from '@/modules/auth/components/MfaVerifyModal.vue';
import SearchModal from '@/core/components/SearchModal.vue';
import ItemForm from '@/modules/tasks/components/ItemForm.vue';
import PrivateTaskForm from '@/modules/tasks/components/PrivateTaskForm.vue';
import ChangePasswordModal from '@/modules/auth/components/ChangePasswordModal.vue';
import SecurityModal from '@/modules/auth/components/SecurityModal.vue';
import DeleteAccountModal from '@/modules/auth/components/DeleteAccountModal.vue';
import CompleteSetup from '@/modules/auth/components/CompleteSetup.vue';
import CreateGroupModal from '@/modules/auth/components/CreateGroupModal.vue';
import JoinGroupModal from '@/modules/auth/components/JoinGroupModal.vue';

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

  searchOpen,
  itemFormOpen,
  itemFormKey,
  itemToEdit,
  itemFormInitialType,
  showChangePassword,
  showSecurity,
  showSetup,
  showDeleteAccount,
  createGroupOpen,
  joinGroupOpen,
  privateTaskFormOpen,
  privateTaskFormKey,
  privateTaskToEdit,
} = storeToRefs(modalStore);



// ── Item form callbacks ────────────────────────────────────────────────────

function onItemFormSuccess() {
  toast.success(t('school.tasks.itemForm.successEdit'));
  modalStore.notifyItemFormSuccess();
}

function onPrivateTaskFormSuccess(task: any) {
  const msg = modalStore.privateTaskToEdit 
    ? t('school.private.successUpdate') 
    : t('school.private.successCreate');
  toast.success(msg);
  modalStore.notifyPrivateTaskFormSuccess(task);
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

async function onAuthSuccess() {
  await userStore.fetchUser();
}
</script>

<template>


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

  <!-- Global private task form -->
  <Teleport to="body">
    <PrivateTaskForm
      v-if="privateTaskFormOpen"
      :key="privateTaskFormKey"
      :initial="privateTaskToEdit || undefined"
      @cancel="modalStore.closePrivateTaskForm()"
      @success="onPrivateTaskFormSuccess"
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

    <CreateGroupModal
      v-if="createGroupOpen"
      @cancel="modalStore.closeCreateGroup()"
    />

    <JoinGroupModal
      v-if="joinGroupOpen"
      @cancel="modalStore.closeJoinGroup()"
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
