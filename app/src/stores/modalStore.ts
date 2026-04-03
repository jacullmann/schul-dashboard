import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { HwItem, PrivateTask } from '@/modules/tasks/types';
import type { ItemType } from '@/modules/tasks/types';

// ---------------------------------------------------------------------------
// Modal Store — single source of truth for all globally-managed modal state.
// Consumers should access this store via the thin composable wrappers
// (useGlobalAuthModal, useSearchModal, useItemForm, useAccountModals) rather
// than importing the store directly in most cases.
// ---------------------------------------------------------------------------

export const useModalStore = defineStore('modals', () => {


  // ── Search modal ──────────────────────────────────────────────────────────
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

  // ── Group Modals ──────────────────────────────────────────────────────────
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

  // ── Item form ─────────────────────────────────────────────────────────────
  const itemFormOpen = ref(false);
  const itemFormKey = ref(0);
  const itemToEdit = ref<HwItem | null>(null);
  const itemFormInitialType = ref<Exclude<ItemType, 'all'>>('homework');

  /** Registry of success callbacks (e.g. page-level reload hooks). */
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

  // ── Private task form ──────────────────────────────────────────────────────
  const privateTaskFormOpen = ref(false);
  const privateTaskFormKey = ref(0);
  const privateTaskToEdit = ref<PrivateTask | null>(null);

  /** Registry of success callbacks (e.g. page-level update hooks). */
  const _privateTaskFormSuccessCallbacks = new Set<(task: PrivateTask) => void>();

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

  function onPrivateTaskFormSuccess(cb: (task: PrivateTask) => void): () => void {
    _privateTaskFormSuccessCallbacks.add(cb);
    return () => _privateTaskFormSuccessCallbacks.delete(cb);
  }

  // ── Account modals ────────────────────────────────────────────────────────
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

  // ── Sidebar ───────────────────────────────────────────────────────────────
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


    // Search modal
    searchOpen,
    searchMode,
    openSearch,
    closeSearch,
    toggleSearch,

    // Group Modals
    createGroupOpen,
    joinGroupOpen,
    openCreateGroup,
    closeCreateGroup,
    openJoinGroup,
    closeJoinGroup,

    // Item form
    itemFormOpen,
    itemFormKey,
    itemToEdit,
    itemFormInitialType,
    openItemForm,
    openEditForm,
    closeItemForm,
    notifyItemFormSuccess,
    onItemFormSuccess,

    // Private task form
    privateTaskFormOpen,
    privateTaskFormKey,
    privateTaskToEdit,
    openPrivateTaskForm,
    openEditPrivateTaskForm,
    closePrivateTaskForm,
    notifyPrivateTaskFormSuccess,
    onPrivateTaskFormSuccess,

    // Account modals
    showChangePassword,
    showSecurity,
    showSetup,
    showDeleteAccount,
    openChangePassword,
    openSecurity,
    openSetup,
    openDeleteAccount,
    closeAllAccountModals,
    // Sidebar
    sidebarExpanded,
    toggleSidebar,
    setSidebarExpanded,
  };
});
