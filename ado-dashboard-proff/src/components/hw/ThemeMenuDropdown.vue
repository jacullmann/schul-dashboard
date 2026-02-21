<template>
  <MenuDropdown
      :model-value="selectedThemeMode"
      :options="themeOptions"
      :prefix="t('global.theme.theme') + ':'"
      @update:model-value="updateTheme"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTheme, type ThemeMode } from '@/composables/useTheme';
import { Sun, Moon, SunMoon } from 'lucide-vue-next';
import MenuDropdown, { type MenuOption } from '@/components/hw/MenuDropdown.vue';
import { useI18n} from "vue-i18n";

const { t } = useI18n();

const themeOptions = computed<MenuOption[]>(() => [
  { value: 'system', label: t('global.theme.system'), icon: SunMoon },
  { value: 'dark', label: t('global.theme.dark'), icon: Moon },
  { value: 'light', label: t('global.theme.light'), icon: Sun }
]);

const { selectedThemeMode, applyTheme } = useTheme();

function updateTheme(mode: string) {
  applyTheme(mode as ThemeMode);
}
</script>