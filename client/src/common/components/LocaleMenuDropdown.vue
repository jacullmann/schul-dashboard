<template>
  <MenuDropdown
      :model-value="locale"
      :options="localeOptions"
      :prefix="t('global.language') + ':'"
      @update:model-value="updateLocale"
  />
</template>

<script setup lang="ts">
import { useLocale } from '@/common/composables/useLocale';
import type { SupportedLocale } from '@/i18n';
import { Languages } from 'lucide-vue-next';
import MenuDropdown, { type MenuOption } from '@/common/components/MenuDropdown.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const localeOptions: MenuOption[] = [
  { value: 'de', label: 'Deutsch', icon: Languages },
  { value: 'en', label: 'English', icon: Languages },
];

const { locale, setLocale } = useLocale();

function updateLocale(loc: string) {
  setLocale(loc as SupportedLocale);
}
</script>