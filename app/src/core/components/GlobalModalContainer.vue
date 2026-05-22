<script setup lang="ts">
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
import AnnouncementForm from '@/modules/announcements/components/AnnouncementForm.vue';
import ImageViewer from '@/modules/tasks/components/ImageViewer.vue';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();

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
  announcementFormOpen,
  announcementFormKey,
  imageViewerOpen,
  imageViewerImages,
  imageViewerInitialIndex,
  confirmOpen,
  confirmOptions,
} = storeToRefs(modalStore);


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

function onAnnouncementFormSuccess() {
  toast.success('Ankündigung erfolgreich veröffentlicht!');
  modalStore.notifyAnnouncementFormSuccess();
}


function onPasswordChanged() {
  toast.success('Passwort erfolgreich geändert!');
  modalStore.showChangePassword = false;
}

function onMfaChanged(enabled: boolean) {
  userStore.setMfaEnabled(enabled);
}

function onSetupSuccess(updatedUser: any) {
  if (updatedUser) {
    userStore.updateUser(updatedUser);
  }
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
  <GoogleLinkModal
    :open="showLinkModal"
    @linked="onAuthSuccess"
    @cancel="closeLinkModal"
  />

  <Teleport to="body">
    <Transition name="fade-scale" appear>
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
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="fade-down" appear>
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

  <BaseDialog
    :open="confirmOpen"
    :title="confirmOptions.title"
    :submit-text="confirmOptions.submitText ?? 'Confirm'"
    :danger="confirmOptions.danger"
    @confirm="modalStore.resolveConfirm(true)"
    @cancel="modalStore.resolveConfirm(false)"
  >
    {{ confirmOptions.content }}
  </BaseDialog>
  <Teleport to="body">
    <Transition name="fade-scale" appear>
      <SearchModal v-if="searchOpen" @cancel="modalStore.closeSearch()" />
    </Transition>
  </Teleport>

  <ItemForm
    :open="itemFormOpen"
    :key="itemFormKey"
    :initial-type="itemFormInitialType"
    :initial="itemToEdit"
    @cancel="modalStore.closeItemForm()"
    @success="onItemFormSuccess"
  />

  <PrivateTaskForm
    :open="privateTaskFormOpen"
    :key="privateTaskFormKey"
    :initial="privateTaskToEdit || undefined"
    @cancel="modalStore.closePrivateTaskForm()"
    @success="onPrivateTaskFormSuccess"
  />

  <AnnouncementForm
    :open="announcementFormOpen"
    :key="announcementFormKey"
    @cancel="modalStore.closeAnnouncementForm()"
    @success="onAnnouncementFormSuccess"
  />

  <ImageViewer
    :visible="imageViewerOpen"
    :images="imageViewerImages"
    :initial-index="imageViewerInitialIndex"
    @cancel="modalStore.closeImageViewer()"
  />

  <ChangePasswordModal
    :open="showChangePassword"
    @cancel="modalStore.showChangePassword = false"
    @success="onPasswordChanged"
  />

  <SecurityModal
    :open="showSecurity"
    :initial-mfa-enabled="user?.mfaEnabled"
    @cancel="modalStore.showSecurity = false"
    @mfa-changed="onMfaChanged"
  />

  <DeleteAccountModal
    :open="showDeleteAccount"
    :email="user?.email || ''"
    @cancel="modalStore.showDeleteAccount = false"
    @deleted="onAccountDeleted"
    @error="onAccountDeleteError"
  />

  <CompleteSetup
    :open="showSetup"
    :is-setup="!user.doneSetup"
    :initial-data="{
      courses: user.courses || [],
    }"
    @cancel="modalStore.showSetup = false"
    @success="modalStore.showSetup = false"
    @update:user="onSetupSuccess"
  />

  <CreateGroupModal
    :open="createGroupOpen"
    @cancel="modalStore.closeCreateGroup()"
  />

  <JoinGroupModal :open="joinGroupOpen" @cancel="modalStore.closeJoinGroup()" />
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
  background: var(--color-danger-hover);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-lg);
  padding: 10px 16px;
  font-size: var(--text-sm);
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
