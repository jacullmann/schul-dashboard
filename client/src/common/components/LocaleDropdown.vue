<script setup lang="ts">
import { usePreferences } from '@/common/composables/usePreferences';
import SelectDropdown, { type UnitOption } from '@/common/components/SelectDropdown.vue';

const localeOptions: UnitOption[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

const { currentLanguage, setPreference } = usePreferences();

function updateLocale(loc: string) {
  setPreference('language', loc);
}
</script>

<template>
  <SelectDropdown
      :model-value="currentLanguage"
      :options="localeOptions"
      @update:model-value="updateLocale"
  />
</template>