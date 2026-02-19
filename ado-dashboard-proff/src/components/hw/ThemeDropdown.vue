<template>
  <SelectDropdown
      :model-value="selectedThemeMode"
      :options="themeOptions"
      @update:model-value="updateTheme"
  />
</template>

<script setup lang="ts">
import { useTheme, type ThemeMode } from '@/composables/useTheme';
import SelectDropdown, { type UnitOption } from '@/components/hw/SelectDropdown.vue';

const themeOptions: UnitOption[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' }
];

const { selectedThemeMode, applyTheme } = useTheme();

function updateTheme(mode: string) {
  applyTheme(mode as ThemeMode);
}
</script>