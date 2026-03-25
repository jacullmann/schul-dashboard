<script setup lang="ts">
import { computed } from 'vue';
import { usePreferences } from '@/common/composables/usePreferences';
import { type UnitOption } from '@/common/components/BaseSelect.vue';
import { useI18n} from "vue-i18n";

const { t } = useI18n();

const themeOptions = computed<UnitOption[]>(() => [
  { value: 'system', label: t('global.theme.system') },
  { value: 'dark', label: t('global.theme.dark') },
  { value: 'light', label: t('global.theme.light') }
]);

const { currentTheme, setPreference } = usePreferences();

function updateTheme(mode: string) {
  setPreference('theme', mode);
}
</script>

<template>
  <BaseSelect
      :model-value="currentTheme"
      :options="themeOptions"
      @update:model-value="updateTheme"
  />
</template>