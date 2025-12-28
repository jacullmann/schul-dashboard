import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import hw from '../hwApi';

interface UserData {
    id: string;
    email: string;
    isAdmin: boolean;
    emailVerified: boolean;
    enrKurs: number;
    wpuKurs1: number;
    wpuKurs2: number;
    theater: number;
    doneSetup: boolean;
    personalized: boolean;
}

export const useUserStore = defineStore('user', () => {
    const user = ref<UserData | null>(null);
    const loading = ref(false);
    const initialized = ref(false);
    const hasShownSetup = ref(false);

    const isLoggedIn = computed(() => user.value !== null);
    const isAdmin = computed(() => user.value?.isAdmin === true);
    const needsSetup = computed(() => user.value !== null && !user.value.doneSetup);

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
                    personalized: data.personalized
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
    }

    function updateUser(updates: Partial<UserData>): void {
        if (user.value) {
            user.value = { ...user.value, ...updates };
        }
    }

    function markSetupShown(): void {
        hasShownSetup.value = true;
    }

    return {
        user,
        loading,
        initialized,
        hasShownSetup,
        isLoggedIn,
        isAdmin,
        needsSetup,
        fetchUser,
        clearUser,
        updateUser,
        markSetupShown
    };
});