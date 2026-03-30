import { ref, watch } from 'vue';

export type ThemeMode = 'system' | 'light' | 'dark';

const LOCAL_STORAGE_KEY = 'theme-preference2gl';

const selectedThemeMode = ref<ThemeMode>('system');
const appliedThemeClass = ref<'light' | 'dark'>('dark');

function prefersDarkScheme(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeClass(mode: 'light' | 'dark') {
  if (mode === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
  appliedThemeClass.value = mode;
}

function calculateAppliedMode(selected: ThemeMode): 'light' | 'dark' {
  return selected === 'system' ? (prefersDarkScheme() ? 'dark' : 'light') : selected;
}

export function initializeTheme() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY) as ThemeMode | null;
    selectedThemeMode.value =
      stored && ['system', 'light', 'dark'].includes(stored) ? stored : 'system';
  } catch {
    selectedThemeMode.value = 'system';
  }
  applyThemeClass(calculateAppliedMode(selectedThemeMode.value));

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (selectedThemeMode.value === 'system') {
      applyThemeClass(e.matches ? 'dark' : 'light');
    }
  });
}

watch(selectedThemeMode, (mode) => applyThemeClass(calculateAppliedMode(mode)));

export function useTheme() {
  function applyTheme(mode: ThemeMode) {
    selectedThemeMode.value = mode;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, mode);
    } catch {}
    applyThemeClass(calculateAppliedMode(mode));
  }

  return { selectedThemeMode, appliedThemeClass, applyTheme, initializeTheme };
}
