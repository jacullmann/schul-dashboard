<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <button
    type="button"
    class="px-4 py-2 rounded-md cursor-pointer bg-action text-on-action border-none font-semibold leading-[1.3] transition-hover hover:bg-action-hover text-body"
  >
    {{ t('hero.cta') }}
  </button>
</template>
