<template>
  <SelectDropdown
      :model-value="locale"
      :options="localeOptions"
      @update:model-value="updateLocale"
  />
</template>

<script setup lang="ts">
import { useLocale } from '@/composables/useLocale';
import type { SupportedLocale } from '@/locales';
import SelectDropdown, { type UnitOption } from '@/components/hw/SelectDropdown.vue';

const localeOptions: UnitOption[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

const { locale, setLocale } = useLocale();

function updateLocale(loc: string) {
  setLocale(loc as SupportedLocale);
}
</script>