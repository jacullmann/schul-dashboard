<script setup lang="ts">
import { Monitor, Moon, Sun } from '@lucide/vue';

const { t } = useI18n();
const colorMode = useColorMode();

const themes = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;
</script>

<template>
  <div
    class="flex gap-0.5 rounded-full bg-ghost-hover p-1"
    role="group"
    :aria-label="t('common.theme')"
  >
    <button
      v-for="theme in themes"
      :key="theme.value"
      type="button"
      class="flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors"
      :class="
        colorMode.preference === theme.value
          ? 'bg-canvas text-on-ghost shadow-[0_1px_2px_oklch(0_0_0/12%)]'
          : 'text-on-ghost-subtle hover:text-on-ghost'
      "
      :title="t(`common.${theme.value}`)"
      :aria-label="t(`common.${theme.value}`)"
      :aria-pressed="colorMode.preference === theme.value"
      @click="colorMode.preference = theme.value"
    >
      <component :is="theme.icon" :size="15" :stroke-width="1.75" aria-hidden="true" />
    </button>
  </div>
</template>
