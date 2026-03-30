import { computed } from 'vue';
import { useTheme, type ThemeMode } from '@/common/composables/useTheme';
import i18n, { type SupportedLocale, LOCALE_KEY } from '@/i18n';

/**
 * Simplified preferences composable for the login app.
 * No backend sync — user isn't authenticated yet.
 * During registration, currentTheme and currentLanguage are sent to the backend
 * as initial preferences.
 */
export function usePreferences() {
  const { applyTheme, selectedThemeMode } = useTheme();

  const currentTheme = computed(() => selectedThemeMode.value);
  const currentLanguage = computed(() => i18n.global.locale.value);

  function setPreference(key: 'theme' | 'language', value: string) {
    if (key === 'theme') {
      applyTheme(value as ThemeMode);
    } else if (key === 'language') {
      i18n.global.locale.value = value as SupportedLocale;
      try {
        localStorage.setItem(LOCALE_KEY, value);
        document.documentElement.setAttribute('lang', value);
      } catch {}
    }
  }

  return { currentTheme, currentLanguage, setPreference };
}
