<script setup lang="ts">
import { defineAsyncComponent, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useToast } from '@/common/composables/useToast';
import { storeToRefs } from 'pinia';
import { useModalStore } from '@/stores/modalStore';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useLogout } from '@/core/composables/useLogout';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { consumePendingInviteRoute } from '@/modules/auth/utils/pendingInvite';

// Modals are split out of the entry chunk so they never delay first paint.
// The v-if ones are prefetched on mount so opening them stays instant.
const loadSearchModal = () => import('@/core/components/SearchModal.vue');
const loadMfaVerifyModal = () =>
  import('@/modules/auth/components/MfaVerifyModal.vue');

const SearchModal = defineAsyncComponent(loadSearchModal);
const MfaVerifyModal = defineAsyncComponent(loadMfaVerifyModal);
const GoogleLinkModal = defineAsyncComponent(
  () => import('@/modules/auth/components/GoogleLinkModal.vue'),
);
const TaskForm = defineAsyncComponent(
  () => import('@/modules/tasks/components/TaskForm.vue'),
);
const PrivateTaskForm = defineAsyncComponent(
  () => import('@/modules/tasks/components/PrivateTaskForm.vue'),
);
const ChangePasswordModal = defineAsyncComponent(
  () => import('@/modules/auth/components/ChangePasswordModal.vue'),
);
const DeleteAccountModal = defineAsyncComponent(
  () => import('@/modules/auth/components/DeleteAccountModal.vue'),
);
const EditCoursesModal = defineAsyncComponent(
  () => import('@/modules/auth/components/EditCoursesModal.vue'),
);
const CreateGroupModal = defineAsyncComponent(
  () => import('@/modules/auth/components/CreateGroupModal.vue'),
);
const InviteModal = defineAsyncComponent(
  () => import('@/modules/auth/components/InviteModal.vue'),
);
const AnnouncementForm = defineAsyncComponent(
  () => import('@/modules/announcements/components/AnnouncementForm.vue'),
);
const ImageViewer = defineAsyncComponent(
  () => import('@/modules/tasks/components/ImageViewer.vue'),
);

onMounted(() => {
  void loadSearchModal().catch(() => {});
  void loadMfaVerifyModal().catch(() => {});
});

const { t } = useI18n();
const router = useRouter();
const toast = useToast();

const modalStore = useModalStore();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { checkAuthStatus } = useAppAuth();
const performLogout = useLogout();
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
  taskFormOpen,
  taskFormKey,
  taskToEdit,
  taskFormInitialType,
  showChangePassword,
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
  imageViewerOrigin,
  imageViewerMenu,
  confirmOpen,
  confirmOptions,
} = storeToRefs(modalStore);

function onTaskFormSuccess() {
  toast.success(t('tasks.list.task_form.success_edit'));
  modalStore.notifyTaskFormSuccess();
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

function onSetupSuccess(updatedUser: any) {
  if (updatedUser) {
    userStore.updateUser(updatedUser);
  }
  modalStore.showSetup = false;
}

async function logout() {
  await performLogout();
}

async function onAccountDeleted() {
  await logout();
  modalStore.showDeleteAccount = false;
}

function onAccountDeleteError(msg: string) {
  toast.error(msg);
}

async function onAuthSuccess() {
  await checkAuthStatus();
  await userStore.fetchUser();

  const inviteRoute = consumePendingInviteRoute();
  if (inviteRoute) await router.replace(inviteRoute);
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

  <Teleport to="body">
    <Transition name="fade-scale" appear>
      <SearchModal v-if="searchOpen" @cancel="modalStore.closeSearch()" />
    </Transition>
  </Teleport>

  <TaskForm
    :key="taskFormKey"
    :open="taskFormOpen"
    :initial-type="taskFormInitialType"
    :initial="taskToEdit"
    @cancel="modalStore.closeTaskForm()"
    @success="onTaskFormSuccess"
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
    :origin="imageViewerOrigin"
    :menu="imageViewerMenu"
    @cancel="modalStore.closeImageViewer()"
  />

  <ChangePasswordModal
    :open="showChangePassword"
    @cancel="modalStore.showChangePassword = false"
    @success="onPasswordChanged"
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

  <!-- The confirm is the only dialog the image viewer can raise while it is
       up, so it has to be lifted over the viewer's own layer. -->
  <BaseDialog
    :open="confirmOpen"
    :elevated="imageViewerOpen"
    :title="confirmOptions.title"
    :submit-text="confirmOptions.submitText ?? t('common.buttons.confirm')"
    :danger="confirmOptions.danger"
    @confirm="modalStore.resolveConfirm(true)"
    @cancel="modalStore.resolveConfirm(false)"
  >
    {{ confirmOptions.content }}
  </BaseDialog>
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
