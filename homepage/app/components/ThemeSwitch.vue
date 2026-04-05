<script setup lang="ts">
import { Moon, Sun, Laptop } from '@lucide/vue';

const { setTheme, preference } = usePerfectTheme();
const themes = useAvailableThemes();

function setThemeMode(theme: string) {
  console.log(preference.value, theme);
  setTheme(theme as any);
  console.log(preference.value, theme);
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <h3 class="text-btn font-semibold text-on-surface m-0 font-sans">{{ $t('common.theme') }}</h3>
    <div class="flex gap-2" role="group" aria-label="Theme selection">
      <button
        type="button"
        :aria-pressed="preference === 'light'"
        class="p-2 rounded-lg border transition-colors"
        :class="preference === 'light'
          ? 'bg-surface-hover border-surface-hover-border text-on-surface'
          : 'bg-surface border-surface-border text-on-surface-muted hover:text-on-surface'
        "
        @click="setThemeMode('light')"
        title="Light mode"
      >
        <Sun :size="18" aria-hidden="true" />
        <span class="sr-only">Light</span>
      </button>

      <button
        type="button"
        :aria-pressed="preference === 'dark'"
        class="p-2 rounded-lg border transition-colors"
        :class="preference === 'dark'
          ? 'bg-surface-hover border-surface-hover-border text-on-surface'
          : 'bg-surface border-surface-border text-on-surface-muted hover:text-on-surface'
        "
        @click="setThemeMode('dark')"
        title="Dark mode"
      >
        <Moon :size="18" aria-hidden="true" />
        <span class="sr-only">Dark</span>
      </button>

      <button
        type="button"
        :aria-pressed="preference === 'system'"
        class="p-2 rounded-lg border transition-colors"
        :class="preference === 'system'
          ? 'bg-surface-hover border-surface-hover-border text-on-surface'
          : 'bg-surface border-surface-border text-on-surface-muted hover:text-on-surface'
        "
        @click="setThemeMode('system')"
        title="System theme"
      >
        <Laptop :size="18" aria-hidden="true" />
        <span class="sr-only">System</span>
      </button>
    </div>
  </div>
</template>

