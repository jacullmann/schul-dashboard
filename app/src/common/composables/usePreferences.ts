import { computed } from 'vue';
import hw from '@/api/api.ts';
import { useTheme, type ThemeMode } from '@/common/composables/useTheme';
import { useUserStore } from '@/stores/userStore';
import i18n, { type SupportedLocale, LOCALE_KEY } from '@/i18n';

type PreferenceKey = 'theme' | 'language';

function applyLanguage(language: string): void {
  i18n.global.locale.value = language as SupportedLocale;
  localStorage.setItem(LOCALE_KEY, language);
  document.documentElement.setAttribute('lang', language);
}

export function usePreferences() {
  const { applyTheme, selectedThemeMode } = useTheme();
  const userStore = useUserStore();

  const currentTheme = computed(() => selectedThemeMode.value);
  const currentLanguage = computed(() => i18n.global.locale.value);

  function setPreference(key: PreferenceKey, value: string): void {
    if (key === 'theme') {
      applyTheme(value as ThemeMode);
    } else {
      applyLanguage(value);
    }

    if (!userStore.isLoggedIn) return;

    // Applied locally first, so a failed sync must not block the UI.
    void hw.patch('/user/preferences', { [key]: value }).catch((err) => {
      console.error(`Failed to sync preference ${key} to backend`, err);
    });
  }

  function syncFromBackend(preferences: Record<string, any>): boolean {
    if (!preferences) return false;

    let hasChanges = false;

    if (preferences.theme && preferences.theme !== currentTheme.value) {
      applyTheme(preferences.theme as ThemeMode);
      hasChanges = true;
    }

    if (
      preferences.language &&
      preferences.language !== currentLanguage.value
    ) {
      applyLanguage(preferences.language);
      hasChanges = true;
    }

    return hasChanges;
  }

  return {
    currentTheme,
    currentLanguage,
    setPreference,
    syncFromBackend,
  };
}
