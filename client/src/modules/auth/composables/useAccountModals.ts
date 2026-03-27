import { useModalStore } from '@/stores/modalStore';

/**
 * Thin composable wrapper around the modal store's account-modals slice.
 * Keeps the public API identical so existing call-sites need no changes.
 */
export function useAccountModals() {
  const store = useModalStore();

  return {
    showChangePassword: store.showChangePassword,
    showSecurity: store.showSecurity,
    showSetup: store.showSetup,
    showDeleteAccount: store.showDeleteAccount,
    openChangePassword: store.openChangePassword,
    openSecurity: store.openSecurity,
    openSetup: store.openSetup,
    openDeleteAccount: store.openDeleteAccount,
    closeAll: store.closeAllAccountModals,
  };
}
