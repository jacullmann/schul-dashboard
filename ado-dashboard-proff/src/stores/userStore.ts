import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import hw from '@/api/hwApi';

interface UserData {
    id: string;
    email: string;
    isAdmin: boolean;
    emailVerified: boolean;
    enrKurs: string | null;
    wpuKurs1: string | null;
    wpuKurs2: string | null;
    theater: number;
    doneSetup: boolean;
    personalized: boolean;
    mfaEnabled: boolean;
}

export const useUserStore = defineStore('user', () => {
    const user = ref<UserData | null>(null);
    const loading = ref(false);
    const initialized = ref(false);
    const hasShownSetup = ref(false);

    const isLoggedIn = computed(() => user.value !== null);
    const isAdmin = computed(() => user.value?.isAdmin === true);
    const needsSetup = computed(() => user.value !== null && !user.value.doneSetup);
    const mfaEnabled = computed(() => user.value?.mfaEnabled === true);

    async function fetchUser(): Promise<void> {
        if (loading.value) return;
        loading.value = true;
        try {
            const { data } = await hw.get('/api/auth/me');
            if (data.authenticated) {
                user.value = {
                    id: data.id,
                    email: data.email,
                    isAdmin: data.isAdmin,
                    emailVerified: data.emailVerified,
                    enrKurs: data.enrKurs,
                    wpuKurs1: data.wpuKurs1,
                    wpuKurs2: data.wpuKurs2,
                    theater: data.theater,
                    doneSetup: data.doneSetup,
                    personalized: data.personalized,
                    mfaEnabled: data.mfaEnabled ?? false
                };
            } else {
                user.value = null;
            }
        } catch {
            user.value = null;
        } finally {
            loading.value = false;
            initialized.value = true;
        }
    }

    function clearUser(): void {
        user.value = null;
        hasShownSetup.value = false;
        initialized.value = false;
    }

    function updateUser(updates: Partial<UserData>): void {
        if (user.value) {
            user.value = { ...user.value, ...updates };
        }
    }

    function markSetupShown(): void {
        hasShownSetup.value = true;
    }

    function setMfaEnabled(enabled: boolean): void {
        if (user.value) {
            user.value.mfaEnabled = enabled;
        }
    }
    return {
        user,
        loading,
        initialized,
        hasShownSetup,
        isLoggedIn,
        isAdmin,
        needsSetup,
        mfaEnabled,
        fetchUser,
        clearUser,
        updateUser,
        markSetupShown,
        setMfaEnabled
    };
});