import { useModalStore } from '@/stores/modalStore';

/**
 * Thin composable wrapper around the modal store's auth-modal slice.
 * Keeps the public API identical so existing call-sites need no changes.
 */
export function useGlobalAuthModal() {
  const store = useModalStore();

  return {
    /** Reactive flag — true while the auth modal is mounted. */
    isAuthModalOpen: store.authModalOpen as Readonly<
      typeof store.authModalOpen
    >,
    /** Opens the modal and returns a Promise that resolves on successful login. */
    openAuthModal: store.openAuthModal,
    closeAuthModal: store.closeAuthModal,
    /**
     * Call this after a successful login attempt so the Promise returned by
     * `openAuthModal` resolves and the modal closes.
     */
    onAuthSuccess: store.resolveAuthModal,
  };
}
