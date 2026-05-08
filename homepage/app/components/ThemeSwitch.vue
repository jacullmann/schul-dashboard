<script setup lang="ts">
import { Moon, Sun, Monitor } from '@lucide/vue';

const colorMode = useColorMode();

function setTheme(theme: string) {
  colorMode.preference = theme;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-btn font-semibold text-on-ghost m-0">{{ $t('common.theme') }}</p>
    <BaseRow role="group" :aria-label="$t('common.theme')">
      <BaseButton
        v-for="{ value, icon, label } in [
          { value: 'light', icon: Sun, label: $t('common.light') },
          { value: 'dark', icon: Moon, label: $t('common.dark') },
          { value: 'system', icon: Monitor, label: $t('common.system') },
        ]"
        :key="value"
        :title="label"
        :aria-pressed="colorMode.preference === value"
        :class="colorMode.preference === value ? 'bg-surface-hover! text-on-ghost!' : ''"
        :icon="icon"
        @click="setTheme(value)"
      />
    </BaseRow>
  </div>
</template>
