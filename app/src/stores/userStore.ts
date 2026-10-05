import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api/api.ts';
import { usePreferences } from '@/common/composables/usePreferences';

export type DismissibleNotice = 'personalizedTasks' | 'personalizedSchedule';

export interface UserPreferences {
  theme?: string;
  language?: string;
  dismissedNotices?: DismissibleNotice[];
}

export interface UserData {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  courses: { subjectId: string; courseId: string }[];
  personalized: boolean;
  mfaEnabled: boolean;
  hasPassword: boolean;
  preferences?: UserPreferences;
  username: string;
}

export const useUserStore = defineStore('user', () => {
  const user = ref<UserData | null>(null);
  const loading = ref(false);
  const initialized = ref(false);
  const savingPersonalization = ref(false);

  const isLoggedIn = computed(() => user.value !== null);
  const role = computed(() => user.value?.role);
  const isSuperadmin = computed(() => user.value?.role === 'superadmin');
  const mfaEnabled = computed(() => user.value?.mfaEnabled === true);
  // Google-only accounts have no password until they set one.
  const hasPassword = computed(() => user.value?.hasPassword !== false);

  let fetchPromise: Promise<void> | null = null;

  async function fetchUser(): Promise<void> {
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
      loading.value = true;
      try {
        const { data } = await api.get('/auth/me');
        if (data.authenticated) {
          user.value = {
            id: data.id,
            email: data.email,
            role: data.role || 'user',
            emailVerified: data.emailVerified,
            courses: data.courses || [],
            personalized: data.personalized,
            mfaEnabled: data.mfaEnabled ?? false,
            hasPassword: data.hasPassword ?? true,
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
    initialized.value = false;
  }

  function updateUser(updates: Partial<UserData>): void {
    if (user.value) {
      user.value = { ...user.value, ...updates };
    }
  }

  function setMfaEnabled(enabled: boolean): void {
    if (user.value) {
      user.value.mfaEnabled = enabled;
    }
  }

  function isNoticeDismissed(notice: DismissibleNotice): boolean {
    return user.value?.preferences?.dismissedNotices?.includes(notice) ?? false;
  }

  function markNoticeDismissed(notice: DismissibleNotice): void {
    if (!user.value || isNoticeDismissed(notice)) return;

    const preferences = user.value.preferences ?? {};
    user.value.preferences = {
      ...preferences,
      dismissedNotices: [...(preferences.dismissedNotices ?? []), notice],
    };
  }

  return {
    user,
    loading,
    initialized,
    savingPersonalization,
    isLoggedIn,
    role,
    isSuperadmin,
    mfaEnabled,
    hasPassword,
    fetchUser,
    clearUser,
    updateUser,
    setMfaEnabled,
    isNoticeDismissed,
    markNoticeDismissed,
  };
});
