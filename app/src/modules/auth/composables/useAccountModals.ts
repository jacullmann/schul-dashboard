import { useModalStore } from '@/stores/modalStore';

export function useAccountModals() {
  const store = useModalStore();

  return {
    showChangePassword: store.showChangePassword,
    showSetup: store.showSetup,
    showDeleteAccount: store.showDeleteAccount,
    openChangePassword: store.openChangePassword,
    openSetup: store.openSetup,
    openDeleteAccount: store.openDeleteAccount,
    closeAll: store.closeAllAccountModals,
  };
}
