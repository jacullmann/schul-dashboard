import { ref, watch } from 'vue';

export type ThemeMode = 'system' | 'light' | 'dark';

const LOCAL_STORAGE_KEY = 'theme-preference2gl';

const selectedThemeMode = ref<ThemeMode>('system');
const appliedThemeClass = ref<'light' | 'dark'>('dark');

function prefersDark(): boolean {
  if (import.meta.server) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeClass(mode: 'light' | 'dark') {
  appliedThemeClass.value = mode;
  if (import.meta.server) return;
  if (mode === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
}

function resolveMode(selected: ThemeMode): 'light' | 'dark' {
  return selected === 'system' ? (prefersDark() ? 'dark' : 'light') : selected;
}

export function applyTheme(mode: ThemeMode) {
  selectedThemeMode.value = mode;
  if (import.meta.client) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, mode);
    } catch {}
  }
  applyThemeClass(resolveMode(mode));
}

export function initializeTheme() {
  if (import.meta.server) return;

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY) as ThemeMode | null;
    if (stored && ['system', 'light', 'dark'].includes(stored)) {
      selectedThemeMode.value = stored;
    } else {
      selectedThemeMode.value = 'system';
      localStorage.setItem(LOCAL_STORAGE_KEY, 'system');
    }
  } catch {
    selectedThemeMode.value = 'system';
  }

  applyThemeClass(resolveMode(selectedThemeMode.value));

  // React to OS preference changes when in system mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (selectedThemeMode.value === 'system') {
      applyThemeClass(e.matches ? 'dark' : 'light');
    }
  });
}

watch(selectedThemeMode, (mode) => applyThemeClass(resolveMode(mode)));

export function useTheme() {
  return { selectedThemeMode, appliedThemeClass, applyTheme, initializeTheme };
}
