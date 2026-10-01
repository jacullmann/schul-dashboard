<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue';
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
import { useIsMobileViewport } from '@/common/composables/useViewport';

// Modals are split out of the entry chunk so they never delay first paint.
// The v-if ones are prefetched on mount so opening them stays instant.
const loadSearchModal = () => import('@/core/components/SearchModal.vue');

const SearchModal = defineAsyncComponent(loadSearchModal);
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
const SetPasswordModal = defineAsyncComponent(
  () => import('@/modules/auth/components/SetPasswordModal.vue'),
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
});

const { t } = useI18n();
const router = useRouter();
const toast = useToast();

const modalStore = useModalStore();
const userStore = useUserStore();
const { user, hasPassword } = storeToRefs(userStore);
const { checkAuthStatus } = useAppAuth();
const performLogout = useLogout();
const { showLinkModal, closeLinkModal } = useOAuth();
const isMobile = useIsMobileViewport();

// On phones the search grows out of the header (HeaderSearchPalette). Its
// parts animate on their own, so the transition is told the longest one.
const searchTransition = computed(() =>
  isMobile.value
    ? { name: 'header-search', duration: { enter: 500, leave: 300 } }
    : { name: 'fade-scale' },
);

const {
  searchOpen,
  taskFormOpen,
  taskFormKey,
  taskFormGroupId,
  taskFormLocal,
  taskToEdit,
  taskFormInitialType,
  showChangePassword,
  showSetup,
  setupGroupId,
  showDeleteAccount,
  createGroupOpen,
  inviteModalOpen,
  inviteModalToken,
  inviteModalGroupId,
  privateTaskFormOpen,
  privateTaskFormKey,
  privateTaskToEdit,
  announcementFormOpen,
  announcementFormKey,
  announcementFormGroupId,
  announcementFormLocal,
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

function onPasswordSet() {
  toast.success(t('auth.set_password.success'));
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
    <Transition
      v-bind="searchTransition"
      appear
      @after-leave="modalStore.onSearchHidden()"
    >
      <SearchModal v-if="searchOpen" @cancel="modalStore.closeSearch()" />
    </Transition>
  </Teleport>

  <TaskForm
    v-if="taskFormGroupId"
    :key="taskFormKey"
    :group-id="taskFormGroupId"
    :local="taskFormLocal"
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
    v-if="announcementFormGroupId"
    :key="announcementFormKey"
    :group-id="announcementFormGroupId"
    :local="announcementFormLocal"
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

  <!-- Every "password" entry point opens this slot; an account without a
       password can only set its first one. -->
  <SetPasswordModal
    v-if="user && !hasPassword"
    :open="showChangePassword"
    :email="user.email"
    @cancel="modalStore.showChangePassword = false"
    @success="onPasswordSet"
  />
  <ChangePasswordModal
    v-else
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
    v-if="user && setupGroupId"
    :open="showSetup"
    :group-id="setupGroupId"
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
    v-if="inviteModalGroupId"
    :open="inviteModalOpen"
    :token="inviteModalToken"
    :group-id="inviteModalGroupId"
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
