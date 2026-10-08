<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePreferences } from '@/common/composables/usePreferences';
import type { UnitOption } from '@/common/components/BaseSelect.vue';

const { t } = useI18n();
const { currentTheme, setPreference } = usePreferences();

const themeOptions = computed<UnitOption[]>(() => [
  { value: 'system', label: t('common.theme.system') },
  { value: 'dark', label: t('common.theme.dark') },
  { value: 'light', label: t('common.theme.light') },
]);
</script>

<template>
  <div class="flex flex-col gap-8">
    <section class="flex flex-col gap-2">
      <h3>{{ t('common.theme.theme') }}</h3>

      <div class="flex flex-col max-md:-mx-6">
        <BaseList
          select
          :separator="false"
          :model-value="currentTheme"
          :options="themeOptions"
          :title="t('common.theme.theme')"
          @update:model-value="setPreference('theme', $event)"
        >
          <template #label>
            {{ t('common.theme.theme') }}
          </template>
          <template #desc>
            {{ t('auth.account_settings.appearance.theme.description') }}
          </template>
        </BaseList>
      </div>
    </section>
  </div>
</template>
