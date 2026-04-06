<script setup lang="ts">
import { Moon, Sun, Monitor } from '@lucide/vue';

const colorMode = useColorMode();

function setTheme(theme: string) {
  colorMode.preference = theme;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-btn font-semibold text-on-surface m-0">{{ $t('common.theme') }}</p>
    <div class="flex gap-1.5" role="group" :aria-label="$t('common.theme')">
      <button
        v-for="{ value, icon, label } in [
          { value: 'light', icon: Sun, label: $t('common.light') },
          { value: 'dark', icon: Moon, label: $t('common.dark') },
          { value: 'system', icon: Monitor, label: $t('common.system') },
        ]"
        :key="value"
        type="button"
        :title="label"
        :aria-pressed="colorMode.preference === value"
        class="p-2 rounded-lg border transition-colors"
        :class="
          colorMode.preference === value
            ? 'bg-surface-hover border-surface-hover-border text-on-surface'
            : 'bg-surface border-surface-border text-on-surface-muted hover:text-on-surface hover:border-surface-hover-border'
        "
        @click="setTheme(value)"
      >
        <component :is="icon" :size="16" aria-hidden="true" />
        <span class="sr-only">{{ label }}</span>
      </button>
    </div>
  </div>
</template>
