<template>
  <SelectDropdown
      :model-value="locale"
      :options="localeOptions"
      @update:model-value="updateLocale"
  />
</template>

<script setup lang="ts">
import { useLocale } from '@/common/composables/useLocale.ts';
import type { SupportedLocale } from '@/i18n';
import SelectDropdown, { type UnitOption } from '@/common/components/SelectDropdown.vue';

const localeOptions: UnitOption[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

const { locale, setLocale } = useLocale();

function updateLocale(loc: string) {
  setLocale(loc as SupportedLocale);
}
</script>