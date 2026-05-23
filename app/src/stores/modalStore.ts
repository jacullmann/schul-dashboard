import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { HwItem, PrivateTask } from '@/modules/tasks/types';
import type { ItemType } from '@/modules/tasks/types';
import type { ImageItem } from '@/modules/tasks/types';

export interface ConfirmOptions {
  title: string;
  content: string;
  submitText?: string;
  danger?: boolean;
}

export const useModalStore = defineStore('modals', () => {
  const searchOpen = ref(false);
  const searchMode = ref<'default' | 'group' | 'theme' | 'language'>('default');

  function openSearch(
    mode: 'default' | 'group' | 'theme' | 'language' = 'default',
  ) {
    searchMode.value = mode;
    searchOpen.value = true;
  }
  function closeSearch() {
    searchOpen.value = false;
  }
  function toggleSearch() {
    if (searchOpen.value) {
      closeSearch();
    } else {
      openSearch('default');
    }
  }

  const createGroupOpen = ref(false);
  const joinGroupOpen = ref(false);

  function openCreateGroup() {
    createGroupOpen.value = true;
  }
  function closeCreateGroup() {
    createGroupOpen.value = false;
  }

  function openJoinGroup() {
    joinGroupOpen.value = true;
  }
  function closeJoinGroup() {
    joinGroupOpen.value = false;
  }

  const itemFormOpen = ref(false);
  const itemFormKey = ref(0);
  const itemToEdit = ref<HwItem | null>(null);
  const itemFormInitialType = ref<Exclude<ItemType, 'all'>>('homework');

  const _itemFormSuccessCallbacks = new Set<() => void>();

  function openItemForm(type: Exclude<ItemType, 'all'> = 'homework') {
    itemToEdit.value = null;
    itemFormInitialType.value = type;
    itemFormKey.value += 1;
    itemFormOpen.value = true;
  }

  function openEditForm(item: HwItem) {
    itemToEdit.value = item;
    itemFormInitialType.value = item.type;
    itemFormKey.value += 1;
    itemFormOpen.value = true;
  }

  function closeItemForm() {
    itemFormOpen.value = false;
  }

  function notifyItemFormSuccess() {
    _itemFormSuccessCallbacks.forEach((cb) => cb());
    closeItemForm();
  }

  function onItemFormSuccess(cb: () => void): () => void {
    _itemFormSuccessCallbacks.add(cb);
    return () => _itemFormSuccessCallbacks.delete(cb);
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

  const _announcementFormSuccessCallbacks = new Set<() => void>();

  function openAnnouncementForm() {
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

  function openImageViewer(images: ImageItem[], initialIndex = 0) {
    imageViewerImages.value = images;
    imageViewerInitialIndex.value = initialIndex;
    imageViewerOpen.value = true;
  }

  function closeImageViewer() {
    imageViewerOpen.value = false;

    setTimeout(() => {
      imageViewerImages.value = [];
      imageViewerInitialIndex.value = 0;
    }, 300);
  }

  const showChangePassword = ref(false);
  const showSecurity = ref(false);
  const showSetup = ref(false);
  const showDeleteAccount = ref(false);

  function openChangePassword() {
    showChangePassword.value = true;
  }
  function openSecurity() {
    showSecurity.value = true;
  }
  function openSetup() {
    showSetup.value = true;
  }
  function openDeleteAccount() {
    showDeleteAccount.value = true;
  }

  const confirmOpen = ref(false);
  const confirmOptions = ref<ConfirmOptions>({
    title: '',
    content: '',
    submitText: 'Confirm',
    danger: false,
  });

  let confirmResolve: ((value: boolean) => void) | null = null;

  function confirm(options: ConfirmOptions): Promise<boolean> {
    confirmOptions.value = {
      title: options.title,
      content: options.content,
      submitText: options.submitText ?? 'Confirm',
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

  function setSidebarExpanded(val: boolean) {
    sidebarExpanded.value = val;
  }

  function closeAllAccountModals() {
    showChangePassword.value = false;
    showSecurity.value = false;
    showSetup.value = false;
    showDeleteAccount.value = false;
  }

  return {
    searchOpen,
    searchMode,
    openSearch,
    closeSearch,
    toggleSearch,

    createGroupOpen,
    joinGroupOpen,
    openCreateGroup,
    closeCreateGroup,
    openJoinGroup,
    closeJoinGroup,

    itemFormOpen,
    itemFormKey,
    itemToEdit,
    itemFormInitialType,
    openItemForm,
    openEditForm,
    closeItemForm,
    notifyItemFormSuccess,
    onItemFormSuccess,

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
    openAnnouncementForm,
    closeAnnouncementForm,
    notifyAnnouncementFormSuccess,
    onAnnouncementFormSuccess,

    imageViewerOpen,
    imageViewerImages,
    imageViewerInitialIndex,
    openImageViewer,
    closeImageViewer,

    showChangePassword,
    showSecurity,
    showSetup,
    showDeleteAccount,
    openChangePassword,
    openSecurity,
    openSetup,
    openDeleteAccount,
    closeAllAccountModals,

    sidebarExpanded,
    toggleSidebar,
    setSidebarExpanded,

    confirmOpen,
    confirmOptions,
    confirm,
    resolveConfirm,
  };
});
