import { useModalStore } from '@/stores/modalStore';

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
