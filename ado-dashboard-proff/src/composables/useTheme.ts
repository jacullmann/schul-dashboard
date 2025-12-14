import { ref, watch, onMounted } from 'vue';

export type ThemeMode = 'system' | 'light' | 'dark';

const LOCAL_STORAGE_KEY = 'theme-preference2gl';

const selectedThemeMode = ref<ThemeMode>('system');
const appliedThemeClass = ref<'light' | 'dark'>('dark');

function prefersDarkScheme(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeClass(mode: 'light' | 'dark') {
    const htmlElement = document.documentElement;
    if (mode === 'light') {
        htmlElement.classList.add('light');
    } else {
        htmlElement.classList.remove('light');
    }
    appliedThemeClass.value = mode;
}

function calculateAppliedMode(selectedMode: ThemeMode): 'light' | 'dark' {
    if (selectedMode === 'system') {
        return prefersDarkScheme() ? 'dark' : 'light';
    }
    return selectedMode;
}

function initializeTheme() {
    const storedPreference = localStorage.getItem(LOCAL_STORAGE_KEY) as ThemeMode | null;

    if (storedPreference && ['system', 'light', 'dark'].includes(storedPreference)) {
        selectedThemeMode.value = storedPreference;
    } else {
        selectedThemeMode.value = 'dark';
        localStorage.setItem(LOCAL_STORAGE_KEY, 'dark');
    }

    applyTheme(selectedThemeMode.value);
}

function applyTheme(newMode: ThemeMode) {
    selectedThemeMode.value = newMode;
    localStorage.setItem(LOCAL_STORAGE_KEY, newMode);

    const modeToApply = calculateAppliedMode(newMode);
    applyThemeClass(modeToApply);
}

function setupSystemModeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
        if (selectedThemeMode.value === 'system') {
            const modeToApply = e.matches ? 'dark' : 'light';
            applyThemeClass(modeToApply);
        }
    };

    onMounted(() => {
        mediaQuery.addEventListener('change', handler);
    });

}

watch(selectedThemeMode, (newMode) => {
    const modeToApply = calculateAppliedMode(newMode);
    applyThemeClass(modeToApply);
}, { immediate: false });

setupSystemModeListener();

export function useTheme() {
    return {
        selectedThemeMode,
        appliedThemeClass,
        applyTheme,
        initializeTheme,
    };
}