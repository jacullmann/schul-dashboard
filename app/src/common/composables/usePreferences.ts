import { computed } from 'vue';
import hw from '@/api/api.ts';
import { useTheme, type ThemeMode } from '@/common/composables/useTheme';
import { useUserStore } from '@/stores/userStore';
import i18n, { type SupportedLocale, LOCALE_KEY } from '@/i18n';

export function usePreferences() {
  const { applyTheme, selectedThemeMode } = useTheme();
  const userStore = useUserStore();

  const currentTheme = computed(() => selectedThemeMode.value);
  const currentLanguage = computed(() => i18n.global.locale.value);

  async function setPreference(key: 'theme' | 'language', value: string) {
    if (key === 'theme') {
      applyTheme(value as ThemeMode);
    } else if (key === 'language') {
      i18n.global.locale.value = value as SupportedLocale;
      localStorage.setItem(LOCALE_KEY, value);
      document.documentElement.setAttribute('lang', value);
    }

    if (userStore.isLoggedIn) {
      try {
        hw.patch('/user/preferences', { [key]: value }).catch((err) => {
          console.error(`Failed to sync preference ${key} to backend`, err);
        });
      } catch (err) {
        console.error(`Error initiating patch for ${key}`, err);
      }
    }
  }

  async function syncFromBackend(preferences: Record<string, any>) {
    if (!preferences) return;

    let hasChanges = false;

    if (preferences.theme && preferences.theme !== currentTheme.value) {
      applyTheme(preferences.theme as ThemeMode);
      hasChanges = true;
    }

    if (
      preferences.language &&
      preferences.language !== currentLanguage.value
    ) {
      i18n.global.locale.value = preferences.language as SupportedLocale;
      localStorage.setItem(LOCALE_KEY, preferences.language);
      document.documentElement.setAttribute('lang', preferences.language);
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
