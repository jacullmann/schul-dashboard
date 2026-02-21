<template>
  <SelectDropdown
      :model-value="selectedThemeMode"
      :options="themeOptions"
      @update:model-value="updateTheme"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTheme, type ThemeMode } from '@/composables/useTheme';
import SelectDropdown, { type UnitOption } from '@/components/hw/SelectDropdown.vue';
import { useI18n} from "vue-i18n";

const { t } = useI18n();

const themeOptions = computed<UnitOption[]>(() => [
  { value: 'system', label: t('global.theme.system') },
  { value: 'dark', label: t('global.theme.dark') },
  { value: 'light', label: t('global.theme.light') }
]);

const { selectedThemeMode, applyTheme } = useTheme();

function updateTheme(mode: string) {
  applyTheme(mode as ThemeMode);
}
</script>