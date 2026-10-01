import { defineStore } from 'pinia';
import { ref } from 'vue';
import i18n from '@/i18n';
import type { HwItem, PrivateTask } from '@/modules/tasks/types';
import type { ItemType } from '@/modules/tasks/types';
import type { ImageItem } from '@/modules/tasks/types';

export interface TaskFormOptions {
  type?: Exclude<ItemType, 'all'>;
  /** Opened from the group's own page, which already tells the group. */
  local?: boolean;
}

export interface ConfirmOptions {
  title: string;
  content: string;
  submitText?: string;
  danger?: boolean;
}

export type SearchMode =
  | 'default'
  | 'group'
  | 'theme'
  | 'language'
  | 'personalization';

export const useModalStore = defineStore('modals', () => {
  const searchOpen = ref(false);
  const searchMode = ref<SearchMode>('default');
  /** Unlike searchOpen, stays set while the search animates closed. */
  const searchVisible = ref(false);

  function openSearch(mode: SearchMode = 'default') {
    searchMode.value = mode;
    searchOpen.value = true;
    searchVisible.value = true;
  }
  function closeSearch() {
    searchOpen.value = false;
  }
  /** A search reopened mid-animation is still visible when the old one finishes. */
  function onSearchHidden() {
    searchVisible.value = searchOpen.value;
  }
  function toggleSearch() {
    if (searchOpen.value) {
      closeSearch();
    } else {
      openSearch('default');
    }
  }

  const createGroupOpen = ref(false);

  function openCreateGroup() {
    createGroupOpen.value = true;
  }
  function closeCreateGroup() {
    createGroupOpen.value = false;
  }

  const inviteModalOpen = ref(false);
  const inviteModalToken = ref<string | null>(null);
  const inviteModalGroupId = ref<string | null>(null);

  function openInviteModal(token: string, groupId: string) {
    inviteModalToken.value = token;
    inviteModalGroupId.value = groupId;
    inviteModalOpen.value = true;
  }
  function closeInviteModal() {
    inviteModalOpen.value = false;
    inviteModalToken.value = null;
    inviteModalGroupId.value = null;
  }

  const taskFormOpen = ref(false);
  const taskFormKey = ref(0);
  /** Fixed when the form opens, so navigating away cannot retarget it. */
  const taskFormGroupId = ref<string | null>(null);
  const taskToEdit = ref<HwItem | null>(null);
  const taskFormInitialType = ref<Exclude<ItemType, 'all'>>('homework');
  /** Launched from the group's own page, where its name is already clear. */
  const taskFormLocal = ref(false);

  const _taskFormSuccessCallbacks = new Set<() => void>();

  function openTaskForm(
    groupId: string,
    { type = 'homework', local = false }: TaskFormOptions = {},
  ) {
    taskFormGroupId.value = groupId;
    taskToEdit.value = null;
    taskFormInitialType.value = type;
    taskFormLocal.value = local;
    taskFormKey.value += 1;
    taskFormOpen.value = true;
  }

  function openEditForm(groupId: string, item: HwItem) {
    taskFormGroupId.value = groupId;
    taskToEdit.value = item;
    taskFormInitialType.value = item.type;
    taskFormLocal.value = false;
    taskFormKey.value += 1;
    taskFormOpen.value = true;
  }

  function closeTaskForm() {
    taskFormOpen.value = false;
  }

  function notifyTaskFormSuccess() {
    _taskFormSuccessCallbacks.forEach((cb) => cb());
    closeTaskForm();
  }

  function onTaskFormSuccess(cb: () => void): () => void {
    _taskFormSuccessCallbacks.add(cb);
    return () => _taskFormSuccessCallbacks.delete(cb);
  }

  const privateTaskFormOpen = ref(false);
  const privateTaskFormKey = ref(0);
  const privateTaskToEdit = ref<PrivateTask | null>(null);

  const _privateTaskFormSuccessCallbacks = new Set<
    (task: PrivateTask) => void
  >();

  function openPrivateTaskForm() {
    privateTaskToEdit.value = null;
    privateTaskFormKey.value += 1;
    privateTaskFormOpen.value = true;
  }

  function openEditPrivateTaskForm(task: PrivateTask) {
    privateTaskToEdit.value = task;
    privateTaskFormKey.value += 1;
    privateTaskFormOpen.value = true;
  }

  function closePrivateTaskForm() {
    privateTaskFormOpen.value = false;
  }

  function notifyPrivateTaskFormSuccess(task: PrivateTask) {
    _privateTaskFormSuccessCallbacks.forEach((cb) => cb(task));
    closePrivateTaskForm();
  }

  function onPrivateTaskFormSuccess(
    cb: (task: PrivateTask) => void,
  ): () => void {
    _privateTaskFormSuccessCallbacks.add(cb);
    return () => _privateTaskFormSuccessCallbacks.delete(cb);
  }

  const announcementFormOpen = ref(false);
  const announcementFormKey = ref(0);
  const announcementFormGroupId = ref<string | null>(null);
  const announcementFormLocal = ref(false);

  const _announcementFormSuccessCallbacks = new Set<() => void>();

  function openAnnouncementForm(groupId: string, { local = false } = {}) {
    announcementFormGroupId.value = groupId;
    announcementFormLocal.value = local;
    announcementFormKey.value += 1;
    announcementFormOpen.value = true;
  }

  function closeAnnouncementForm() {
    announcementFormOpen.value = false;
  }

  function notifyAnnouncementFormSuccess() {
    _announcementFormSuccessCallbacks.forEach((cb) => cb());
    closeAnnouncementForm();
  }

  function onAnnouncementFormSuccess(cb: () => void): () => void {
    _announcementFormSuccessCallbacks.add(cb);
    return () => _announcementFormSuccessCallbacks.delete(cb);
  }

  const imageViewerOpen = ref(false);
  const imageViewerImages = ref<ImageItem[]>([]);
  const imageViewerInitialIndex = ref(0);
  // Resolves the grid tile an image was opened from, so the viewer can grow
  // out of it. Set by the page that owns the tiles.
  const imageViewerOrigin = ref<((index: number) => HTMLElement | null) | null>(
    null,
  );
  // Opens the context menu of the image on show. Set by the page that owns the
  // images, because the viewer only knows the picture, not what can be done
  // with it.
  const imageViewerMenu = ref<
    ((event: MouseEvent, index: number) => void) | null
  >(null);

  let imageViewerResetTimeout: ReturnType<typeof setTimeout> | null = null;

  function cancelImageViewerReset() {
    if (imageViewerResetTimeout) {
      clearTimeout(imageViewerResetTimeout);
      imageViewerResetTimeout = null;
    }
  }

  function openImageViewer(
    images: ImageItem[],
    initialIndex = 0,
    origin: ((index: number) => HTMLElement | null) | null = null,
    menu: ((event: MouseEvent, index: number) => void) | null = null,
  ) {
    // A close that is still waiting to clear the state would otherwise empty
    // the viewer that is opening right now.
    cancelImageViewerReset();
    imageViewerImages.value = images;
    imageViewerInitialIndex.value = initialIndex;
    imageViewerOrigin.value = origin;
    imageViewerMenu.value = menu;
    imageViewerOpen.value = true;
  }

  function closeImageViewer() {
    imageViewerOpen.value = false;

    // The delay outlasts the viewer's close animation, which still reads the
    // images and the origin tile while it shrinks back into the grid.
    cancelImageViewerReset();
    imageViewerResetTimeout = setTimeout(() => {
      imageViewerResetTimeout = null;
      imageViewerImages.value = [];
      imageViewerInitialIndex.value = 0;
      imageViewerOrigin.value = null;
      imageViewerMenu.value = null;
    }, 500);
  }

  const showChangePassword = ref(false);
  const showSetup = ref(false);
  const setupGroupId = ref<string | null>(null);
  const showDeleteAccount = ref(false);

  function openChangePassword() {
    showChangePassword.value = true;
  }
  /** Course choices are per group, so the dialog is bound to one. */
  function openSetup(groupId: string) {
    setupGroupId.value = groupId;
    showSetup.value = true;
  }
  function openDeleteAccount() {
    showDeleteAccount.value = true;
  }

  const confirmOpen = ref(false);
  const confirmOptions = ref<ConfirmOptions>({
    title: '',
    content: '',
    submitText: i18n.global.t('common.buttons.confirm'),
    danger: false,
  });

  let confirmResolve: ((value: boolean) => void) | null = null;

  function confirm(options: ConfirmOptions): Promise<boolean> {
    confirmOptions.value = {
      title: options.title,
      content: options.content,
      submitText: options.submitText ?? i18n.global.t('common.buttons.confirm'),
      danger: options.danger ?? false,
    };
    confirmOpen.value = true;

    return new Promise((resolve) => {
      confirmResolve = resolve;
    });
  }

  function resolveConfirm(value: boolean) {
    confirmOpen.value = false;
    if (confirmResolve) {
      confirmResolve(value);
      confirmResolve = null;
    }
  }

  const sidebarExpanded = ref(false);

  function toggleSidebar() {
    sidebarExpanded.value = !sidebarExpanded.value;
  }

  function closeAllAccountModals() {
    showChangePassword.value = false;
    showSetup.value = false;
    showDeleteAccount.value = false;
  }

  return {
    searchOpen,
    searchMode,
    searchVisible,
    openSearch,
    closeSearch,
    onSearchHidden,
    toggleSearch,

    createGroupOpen,
    openCreateGroup,
    closeCreateGroup,

    inviteModalOpen,
    inviteModalToken,
    inviteModalGroupId,
    openInviteModal,
    closeInviteModal,

    taskFormOpen,
    taskFormKey,
    taskToEdit,
    taskFormInitialType,
    taskFormGroupId,
    taskFormLocal,
    openTaskForm,
    openEditForm,
    closeTaskForm,
    notifyTaskFormSuccess,
    onTaskFormSuccess,

    privateTaskFormOpen,
    privateTaskFormKey,
    privateTaskToEdit,
    openPrivateTaskForm,
    openEditPrivateTaskForm,
    closePrivateTaskForm,
    notifyPrivateTaskFormSuccess,
    onPrivateTaskFormSuccess,

    announcementFormOpen,
    announcementFormKey,
    announcementFormGroupId,
    announcementFormLocal,
    openAnnouncementForm,
    closeAnnouncementForm,
    notifyAnnouncementFormSuccess,
    onAnnouncementFormSuccess,

    imageViewerOpen,
    imageViewerImages,
    imageViewerInitialIndex,
    imageViewerOrigin,
    imageViewerMenu,
    openImageViewer,
    closeImageViewer,

    showChangePassword,
    showSetup,
    setupGroupId,
    showDeleteAccount,
    openChangePassword,
    openSetup,
    openDeleteAccount,
    closeAllAccountModals,

    sidebarExpanded,
    toggleSidebar,

    confirmOpen,
    confirmOptions,
    confirm,
    resolveConfirm,
  };
});
