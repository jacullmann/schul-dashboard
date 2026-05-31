import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import hw from '@/api/api.ts';
import { usePreferences } from '@/common/composables/usePreferences';

export interface UserData {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  courses: { subjectId: string; courseId: string }[];
  doneSetup: boolean;
  personalized: boolean;
  mfaEnabled: boolean;
  tenantRole: string | null;
  preferences?: Record<string, any>;
  username: string;
}

export const useUserStore = defineStore('user', () => {
  const user = ref<UserData | null>(null);
  const loading = ref(false);
  const initialized = ref(false);
  const hasShownSetup = ref(false);

  const isLoggedIn = computed(() => user.value !== null);
  const role = computed(() => user.value?.role);
  const isSuperadmin = computed(() => user.value?.role === 'superadmin');
  const needsSetup = computed(
    () => user.value !== null && !user.value.doneSetup,
  );
  const mfaEnabled = computed(() => user.value?.mfaEnabled === true);
  const isGroupAdmin = computed(
    () =>
      user.value?.role === 'superadmin' ||
      user.value?.tenantRole === 'admin' ||
      user.value?.tenantRole === 'moderator',
  );

  let fetchPromise: Promise<void> | null = null;

  async function fetchUser(): Promise<void> {
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
      loading.value = true;
      try {
        const { data } = await hw.get('/auth/me');
        if (data.authenticated) {
          user.value = {
            id: data.id,
            email: data.email,
            role: data.role || 'user',
            emailVerified: data.emailVerified,
            courses: data.courses || [],
            doneSetup: data.doneSetup,
            personalized: data.personalized,
            mfaEnabled: data.mfaEnabled ?? false,
            tenantRole: data.tenantRole ?? null,
            preferences: data.preferences,
            username: data.username || '',
          };

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
    })();

    try {
      await fetchPromise;
    } finally {
      fetchPromise = null;
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
    isGroupAdmin,
  };
});
