<script setup lang="ts">
import { usePreferences } from '@/common/composables/usePreferences';
import { Languages } from '@lucide/vue';
import MenuDropdown, {
  type MenuOption,
} from '@/common/components/MenuDropdown.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const localeOptions: MenuOption[] = [
  { value: 'de', label: 'Deutsch', icon: Languages },
  { value: 'en', label: 'English', icon: Languages },
];

const { currentLanguage, setPreference } = usePreferences();

function updateLocale(loc: string) {
  setPreference('language', loc);
}
</script>

<template>
  <MenuDropdown
    :model-value="currentLanguage"
    :options="localeOptions"
    :prefix="t('global.language') + ':'"
    @update:model-value="updateLocale"
  />
</template>
