import { ref, computed, watch } from 'vue';

export type ThemeMode = 'system' | 'light' | 'dark';

export function useTheme() {
  const cookie = useCookie<ThemeMode>('theme-pref', {
    default: () => 'system' as ThemeMode,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  // Validate and reset invalid values
  if (cookie.value && !['system', 'light', 'dark'].includes(cookie.value)) {
    cookie.value = 'system';
  }

  function setTheme(mode: ThemeMode) {
    cookie.value = mode;
  }

  return {
    selectedThemeMode: cookie,
    setTheme,
  };
}

