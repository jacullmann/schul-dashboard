// Runs before first paint so the initial loading screen matches the theme;
// mirrors the resolution in src/common/composables/useTheme.ts.
try {
  const themePreference = localStorage.getItem('theme-preference2gl');
  const prefersDark =
    themePreference === 'dark' ||
    (themePreference !== 'light' &&
      matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', prefersDark);
} catch {
  // Storage can be blocked; useTheme still applies the theme once the app boots.
}
