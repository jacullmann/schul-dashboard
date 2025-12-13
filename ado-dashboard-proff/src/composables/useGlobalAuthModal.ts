import { ref } from 'vue';

const isAuthModalOpen = ref(false);
const authResolve = ref<((token: string) => void) | null>(null);

export function useGlobalAuthModal() {
    function openAuthModal(): Promise<string> {
        if (isAuthModalOpen.value) {
            return Promise.reject(new Error('Auth modal already open'));
        }

        isAuthModalOpen.value = true;

        return new Promise((resolve) => {
            authResolve.value = resolve;
        });
    }

    function closeAuthModal() {
        isAuthModalOpen.value = false;
        authResolve.value = null;
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
        onAuthSuccess
    };
}