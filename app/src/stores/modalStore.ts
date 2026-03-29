import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { HwItem } from '@/modules/tasks/types';
import type { ItemType } from '@/modules/tasks/types';

// ---------------------------------------------------------------------------
// Modal Store — single source of truth for all globally-managed modal state.
// Consumers should access this store via the thin composable wrappers
// (useGlobalAuthModal, useSearchModal, useItemForm, useAccountModals) rather
// than importing the store directly in most cases.
// ---------------------------------------------------------------------------

export const useModalStore = defineStore('modals', () => {
  // ── Auth modal ────────────────────────────────────────────────────────────
  const authModalOpen = ref(false);
  const _authResolve = ref<((token: string) => void) | null>(null);
  const _authReject = ref<((reason?: unknown) => void) | null>(null);

  function openAuthModal(): Promise<string> {
    if (authModalOpen.value) {
      // Re-open by briefly toggling — same behaviour as before.
      authModalOpen.value = false;
      setTimeout(() => {
        authModalOpen.value = true;
      }, 10);
      return Promise.resolve('');
    }
    authModalOpen.value = true;
    return new Promise((resolve, reject) => {
      _authResolve.value = resolve;
      _authReject.value = reject;
    });
  }

  function closeAuthModal() {
    authModalOpen.value = false;
    _authReject.value?.(new Error('Auth modal closed.'));
    _authResolve.value = null;
    _authReject.value = null;
  }

  function resolveAuthModal(token: string) {
    _authResolve.value?.(token);
    closeAuthModal();
  }

  // ── Search modal ──────────────────────────────────────────────────────────
  const searchOpen = ref(false);

  function openSearch() {
    searchOpen.value = true;
  }
  function closeSearch() {
    searchOpen.value = false;
  }
  function toggleSearch() {
    searchOpen.value = !searchOpen.value;
  }

  // ── Group Switch modal ────────────────────────────────────────────────────
  const groupSwitchOpen = ref(false);

  function openGroupSwitch() {
    groupSwitchOpen.value = true;
  }
  function closeGroupSwitch() {
    groupSwitchOpen.value = false;
  }

  // ── Theme Switch modal ────────────────────────────────────────────────────
  const themeSwitchOpen = ref(false);

  function openThemeSwitch() {
    themeSwitchOpen.value = true;
  }
  function closeThemeSwitch() {
    themeSwitchOpen.value = false;
  }

  // ── Language Switch modal ─────────────────────────────────────────────────
  const languageSwitchOpen = ref(false);

  function openLanguageSwitch() {
    languageSwitchOpen.value = true;
  }
  function closeLanguageSwitch() {
    languageSwitchOpen.value = false;
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
    // Auth modal
    authModalOpen,
    openAuthModal,
    closeAuthModal,
    resolveAuthModal,

    // Search modal
    searchOpen,
    openSearch,
    closeSearch,
    toggleSearch,

    // Group Switch modal
    groupSwitchOpen,
    openGroupSwitch,
    closeGroupSwitch,

    // Theme Switch modal
    themeSwitchOpen,
    openThemeSwitch,
    closeThemeSwitch,

    // Language Switch modal
    languageSwitchOpen,
    openLanguageSwitch,
    closeLanguageSwitch,

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
