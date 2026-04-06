<script setup lang="ts">
import { computed } from 'vue';
import { usePreferences } from '@/common/composables/usePreferences';
import { Sun, Moon, SunMoon } from '@lucide/vue';
import MenuDropdown, {
  type MenuOption,
} from '@/common/components/MenuDropdown.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const themeOptions = computed<MenuOption[]>(() => [
  { value: 'system', label: t('global.theme.system'), icon: SunMoon },
  { value: 'dark', label: t('global.theme.dark'), icon: Moon },
  { value: 'light', label: t('global.theme.light'), icon: Sun },
]);

const { currentTheme, setPreference } = usePreferences();

function updateTheme(mode: string) {
  setPreference('theme', mode);
}
</script>

<template>
  <MenuDropdown
    :model-value="currentTheme"
    :options="themeOptions"
    :prefix="t('global.theme.theme') + ':'"
    @update:model-value="updateTheme"
  />
</template>
