import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import hw from '@/api/hwApi';
import { usePreferences } from '@/common/composables/usePreferences';

interface UserData {
    id: string;
    email: string;
    role: string;
    emailVerified: boolean;
    enrKurs: string | null;
    wpuKurs1: string | null;
    wpuKurs2: string | null;
    theater: number;
    doneSetup: boolean;
    personalized: boolean;
    mfaEnabled: boolean;
    tenantRole: string | null;
    preferences?: Record<string, any>;
}

export const useUserStore = defineStore('user', () => {
    const user = ref<UserData | null>(null);
    const loading = ref(false);
    const initialized = ref(false);
    const hasShownSetup = ref(false);

    // We defer accessing usePreferences here to avoid circular dependency loops during initialization
    // by using it directly inside fetchUser

    const isLoggedIn = computed(() => user.value !== null);
    const role = computed(() => user.value?.role);
    const isSuperadmin = computed(() => user.value?.role === 'superadmin');
    const needsSetup = computed(() => user.value !== null && !user.value.doneSetup);
    const mfaEnabled = computed(() => user.value?.mfaEnabled === true);
    const isGroupAdmin = computed(() =>
        user.value?.role === 'superadmin' ||
        user.value?.tenantRole === 'admin' ||
        user.value?.tenantRole === 'moderator'
    );

    async function fetchUser(): Promise<void> {
        if (loading.value) return;
        loading.value = true;
        try {
            const { data } = await hw.get('/api/auth/me');
            if (data.authenticated) {
                user.value = {
                    id: data.id,
                    email: data.email,
                    role: data.role || 'user',
                    emailVerified: data.emailVerified,
                    enrKurs: data.enrKurs,
                    wpuKurs1: data.wpuKurs1,
                    wpuKurs2: data.wpuKurs2,
                    theater: data.theater,
                    doneSetup: data.doneSetup,
                    personalized: data.personalized,
                    mfaEnabled: data.mfaEnabled ?? false,
                    tenantRole: data.tenantRole ?? null,
                    preferences: data.preferences
                };

                // Sync preferences if any exist
                if (data.preferences) {
                    const { syncFromBackend } = usePreferences();
                    syncFromBackend(data.preferences);
                }

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
        role,
        isSuperadmin,
        needsSetup,
        mfaEnabled,
        fetchUser,
        clearUser,
        updateUser,
        markSetupShown,
        setMfaEnabled,
        isGroupAdmin
    };
});