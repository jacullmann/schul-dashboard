export type ThemePreference = 'light' | 'dark' | 'system';

export const usePerfectTheme = () => {
  const colorMode = useColorMode();
  const { t } = useI18n();

  const isDark = computed(() => colorMode.value === 'dark');
  const isLight = computed(() => colorMode.value === 'light');

  const setTheme = (theme: ThemePreference) => {
    colorMode.preference = theme;
  };

  const toggleTheme = () => {
    setTheme(isDark.value ? 'light' : 'dark');
  };

  const themeLabel = computed(() => {
    const preference = colorMode.preference;
    if (preference === 'system') {
      return `${t('common.theme')} (${isDark.value ? t('common.dark') : t('common.light')})`;
    }
    return t(`common.${preference}`);
  });

  return {
    isDark,
    isLight,
    preference: computed(() => colorMode.preference as ThemePreference),
    setTheme,
    toggleTheme,
    themeLabel,
  };
};

export const useAvailableThemes = () => {
  const { t } = useI18n();
  return [
    { value: 'light' as const, label: () => t('common.light') },
    { value: 'dark' as const, label: () => t('common.dark') },
    { value: 'system' as const, label: () => t('common.system') },
  ];
};