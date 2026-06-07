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
import hw from '../../api/api';

import GoogleLinkModal from '@/modules/auth/components/GoogleLinkModal.vue';
import MfaVerifyModal from '@/modules/auth/components/MfaVerifyModal.vue';
import SearchModal from '@/core/components/SearchModal.vue';
import ItemForm from '@/modules/tasks/components/ItemForm.vue';
import PrivateTaskForm from '@/modules/tasks/components/PrivateTaskForm.vue';
import ChangePasswordModal from '@/modules/auth/components/ChangePasswordModal.vue';
import SecurityModal from '@/modules/auth/components/SecurityModal.vue';
import DeleteAccountModal from '@/modules/auth/components/DeleteAccountModal.vue';
import EditCoursesModal from '@/modules/auth/components/EditCoursesModal.vue';
import CreateGroupModal from '@/modules/auth/components/CreateGroupModal.vue';
import InviteModal from '@/modules/auth/components/InviteModal.vue';
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
  inviteModalOpen,
  inviteModalToken,
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
  toast.success(t('tasks.list.item_form.success_edit'));
  modalStore.notifyItemFormSuccess();
}

function onPrivateTaskFormSuccess(task: any) {
  const msg = modalStore.privateTaskToEdit
    ? t('tasks.private_tasks.success_update')
    : t('tasks.private_tasks.success_create');
  toast.success(msg);
  modalStore.notifyPrivateTaskFormSuccess(task);
}

function onAnnouncementFormSuccess() {
  toast.success(t('announcements.actions.publish_success_toast'));
  modalStore.notifyAnnouncementFormSuccess();
}

function onPasswordChanged() {
  toast.success(t('auth.change_password.success_toast'));
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
    await hw.post('/auth/logout');
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
          :aria-label="t('common.actions.close_aria_label')"
          @click="clearOAuthError"
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
    :key="itemFormKey"
    :open="itemFormOpen"
    :initial-type="itemFormInitialType"
    :initial="itemToEdit"
    @cancel="modalStore.closeItemForm()"
    @success="onItemFormSuccess"
  />

  <PrivateTaskForm
    :key="privateTaskFormKey"
    :open="privateTaskFormOpen"
    :initial="privateTaskToEdit || undefined"
    @cancel="modalStore.closePrivateTaskForm()"
    @success="onPrivateTaskFormSuccess"
  />

  <AnnouncementForm
    :key="announcementFormKey"
    :open="announcementFormOpen"
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

  <EditCoursesModal
    v-if="user"
    :open="showSetup"
    :is-setup="!user?.doneSetup"
    :initial-data="{
      courses: user?.courses || [],
    }"
    @cancel="modalStore.showSetup = false"
    @success="modalStore.showSetup = false"
    @update:user="onSetupSuccess"
  />

  <CreateGroupModal
    :open="createGroupOpen"
    @cancel="modalStore.closeCreateGroup()"
  />

  <InviteModal
    :open="inviteModalOpen"
    :token="inviteModalToken"
    @cancel="modalStore.closeInviteModal()"
  />
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
