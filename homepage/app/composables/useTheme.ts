export type ThemeMode = 'system' | 'light' | 'dark';

export function useTheme() {
  const colorMode = useColorMode();

  function setTheme(mode: ThemeMode): void {
    colorMode.preference = mode;
  }

  return {
    selectedThemeMode: computed(() => colorMode.preference as ThemeMode),
    resolvedTheme: computed(() => colorMode.value as 'light' | 'dark'),
    setTheme,
  };
}