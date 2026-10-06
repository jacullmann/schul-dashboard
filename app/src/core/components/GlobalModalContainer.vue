<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useToast } from '@/common/composables/useToast';
import { storeToRefs } from 'pinia';
import {
  useAnnouncementFormModal,
  useAnnouncementsModal,
  useChangePasswordModal,
  useConfirmModal,
  useCreateGroupModal,
  useDeleteAccountModal,
  useImageViewerModal,
  useInviteModal,
  usePrivateTaskFormModal,
  useSearchModal,
  useTaskFormModal,
} from '@/stores/modalStore';
import type { PrivateTask } from '@/modules/tasks/types';
import { useUserStore } from '@/stores/userStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useLogout } from '@/core/composables/useLogout';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import { useIsMobileViewport } from '@/common/composables/useViewport';

// Modals are split out of the entry chunk so they never delay first paint.
// The v-if ones are prefetched on mount so opening them stays instant.
const loadSearchModal = () => import('@/core/components/SearchModal.vue');

const SearchModal = defineAsyncComponent(loadSearchModal);
const GoogleLinkModal = defineAsyncComponent(
  () => import('@/modules/auth/components/GoogleLinkModal.vue'),
);
const GoogleSignUpModal = defineAsyncComponent(
  () => import('@/modules/auth/components/GoogleSignUpModal.vue'),
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
const CreateGroupModal = defineAsyncComponent(
  () => import('@/modules/auth/components/CreateGroupModal.vue'),
);
const InviteModal = defineAsyncComponent(
  () => import('@/modules/auth/components/InviteModal.vue'),
);
const AnnouncementForm = defineAsyncComponent(
  () => import('@/modules/announcements/components/AnnouncementForm.vue'),
);
const AnnouncementsModal = defineAsyncComponent(
  () => import('@/modules/announcements/components/AnnouncementsModal.vue'),
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

const userStore = useUserStore();
const { user, hasPassword } = storeToRefs(userStore);
const { checkAuthStatus, homeRoute } = useAppAuth();
const performLogout = useLogout();
const { showLinkModal, closeLinkModal, showSignUpModal, closeSignUpModal } =
  useOAuth();
const isMobile = useIsMobileViewport();

// On phones the search grows out of the header (HeaderSearchPalette). Its
// parts animate on their own, so the transition is told the longest one.
const searchTransition = computed(() =>
  isMobile.value
    ? { name: 'header-search', duration: { enter: 500, leave: 300 } }
    : { name: 'fade-scale' },
);

const searchModal = useSearchModal();
const taskForm = useTaskFormModal();
const privateTaskForm = usePrivateTaskFormModal();
const announcementForm = useAnnouncementFormModal();
const announcements = useAnnouncementsModal();
const imageViewer = useImageViewerModal();
const changePassword = useChangePasswordModal();
const deleteAccount = useDeleteAccountModal();
const createGroup = useCreateGroupModal();
const invite = useInviteModal();
const confirmModal = useConfirmModal();

function onTaskFormSuccess() {
  toast.success(t('tasks.list.task_form.success_edit'));
  taskForm.succeed();
}

function onPrivateTaskFormSuccess(task: PrivateTask) {
  const msg = privateTaskForm.payload?.task
    ? t('tasks.private_tasks.success_update')
    : t('tasks.private_tasks.success_create');
  toast.success(msg);
  privateTaskForm.succeed(task);
}

function onAnnouncementFormSuccess() {
  toast.success(t('announcements.actions.publish_success_toast'));
  announcementForm.succeed();
}

function onPasswordChanged() {
  toast.success(t('auth.change_password.success_toast'));
  changePassword.close();
}

function onPasswordSet() {
  toast.success(t('auth.set_password.success'));
  changePassword.close();
}

async function logout() {
  await performLogout();
}

async function onAccountDeleted() {
  await logout();
  deleteAccount.close();
}

function onAccountDeleteError(msg: string) {
  toast.error(msg);
}

// The Google dialogs open on the sign-in pages; the route guard forwards to
// a pending invite instead of the home route if there is one.
async function onAuthSuccess() {
  await checkAuthStatus();
  await userStore.fetchUser();
  await router.replace(homeRoute.value);
}
</script>

<template>
  <GoogleLinkModal
    :open="showLinkModal"
    @linked="onAuthSuccess"
    @cancel="closeLinkModal"
  />
  <GoogleSignUpModal
    :open="showSignUpModal"
    @signed-up="onAuthSuccess"
    @cancel="closeSignUpModal"
  />

  <Teleport to="body">
    <Transition
      v-bind="searchTransition"
      appear
      @after-leave="searchModal.onHidden()"
    >
      <SearchModal v-if="searchModal.isOpen" @cancel="searchModal.close()" />
    </Transition>
  </Teleport>

  <TaskForm
    v-if="taskForm.payload"
    :key="taskForm.key"
    :group-id="taskForm.payload.groupId"
    :local="taskForm.payload.local"
    :open="taskForm.isOpen"
    :initial-type="taskForm.payload.type"
    :initial="taskForm.payload.item"
    @cancel="taskForm.close()"
    @success="onTaskFormSuccess"
  />

  <PrivateTaskForm
    :key="privateTaskForm.key"
    :open="privateTaskForm.isOpen"
    :initial="privateTaskForm.payload?.task ?? undefined"
    @cancel="privateTaskForm.close()"
    @success="onPrivateTaskFormSuccess"
  />

  <AnnouncementForm
    v-if="announcementForm.payload"
    :key="announcementForm.key"
    :group-id="announcementForm.payload.groupId"
    :local="announcementForm.payload.local"
    :open="announcementForm.isOpen"
    @cancel="announcementForm.close()"
    @success="onAnnouncementFormSuccess"
  />

  <AnnouncementsModal
    :open="announcements.isOpen"
    :origin="announcements.payload?.origin ?? null"
    @cancel="announcements.close()"
  />

  <!-- Stays mounted while closed: its open animation needs the visible prop
       to change, and its close animation still reads the images. -->
  <ImageViewer
    :visible="imageViewer.isOpen"
    :images="imageViewer.payload?.images ?? []"
    :initial-index="imageViewer.payload?.initialIndex ?? 0"
    :origin="imageViewer.payload?.origin"
    :menu="imageViewer.payload?.menu"
    @cancel="imageViewer.close()"
  />

  <!-- Every "password" entry point opens this slot; an account without a
       password can only set its first one. -->
  <SetPasswordModal
    v-if="user && !hasPassword"
    :open="changePassword.isOpen"
    :email="user.email"
    @cancel="changePassword.close()"
    @success="onPasswordSet"
  />
  <ChangePasswordModal
    v-else
    :open="changePassword.isOpen"
    @cancel="changePassword.close()"
    @success="onPasswordChanged"
  />

  <DeleteAccountModal
    :open="deleteAccount.isOpen"
    :email="user?.email || ''"
    @cancel="deleteAccount.close()"
    @deleted="onAccountDeleted"
    @error="onAccountDeleteError"
  />

  <CreateGroupModal :open="createGroup.isOpen" @cancel="createGroup.close()" />

  <InviteModal
    v-if="invite.payload"
    :open="invite.isOpen"
    :token="invite.payload.token"
    :group-id="invite.payload.groupId"
    @cancel="invite.close()"
  />

  <!-- The confirm is the only dialog the image viewer can raise while it is
       up, so it has to be lifted over the viewer's own layer. -->
  <BaseDialog
    :open="confirmModal.isOpen"
    :elevated="imageViewer.isOpen"
    :title="confirmModal.options.title"
    :submit-text="confirmModal.options.submitText"
    :danger="confirmModal.options.danger"
    @confirm="confirmModal.answer(true)"
    @cancel="confirmModal.answer(false)"
  >
    {{ confirmModal.options.content }}
  </BaseDialog>
</template>
