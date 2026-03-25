<script setup lang="ts">
import { usePreferences } from '@/common/composables/usePreferences';
import { type UnitOption } from '@/common/components/BaseSelect.vue';

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
  <BaseSelect
      :model-value="currentLanguage"
      :options="localeOptions"
      @update:model-value="updateLocale"
  />
</template>