<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <button
    type="button"
    class="px-4 py-2 cursor-pointer bg-transparent text-on-surface-muted border-none font-medium leading-[1.3] transition-hover hover:text-on-surface text-body"
  >
    {{ t('hero.learnMore') }}
  </button>
</template>
