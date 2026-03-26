import { ref } from 'vue';

const isAuthModalOpen = ref(false);
const authResolve = ref<((token: string) => void) | null>(null);
const authReject = ref<((reason?: any) => void) | null>(null);

export function useGlobalAuthModal() {
  function openAuthModal(): Promise<string> {
    if (isAuthModalOpen.value) {
      isAuthModalOpen.value = false;
      setTimeout(() => {
        isAuthModalOpen.value = true;
      }, 10);
      return Promise.resolve('');
    }

    isAuthModalOpen.value = true;
    return new Promise((resolve, reject) => {
      authResolve.value = resolve;
      authReject.value = reject;
    });
  }

  function closeAuthModal() {
    isAuthModalOpen.value = false;
    if (authReject.value) {
      authReject.value(new Error('Auth Modal has been closed incorrectly.'));
    }
    authResolve.value = null;
    authReject.value = null;
  }

  function onAuthSuccess(token: string) {
    if (authResolve.value) {
      authResolve.value(token);
    }
    closeAuthModal();
  }

  return {
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    onAuthSuccess,
  };
}
