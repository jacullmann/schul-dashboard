<template>
  <button
    class="px-4 py-2 text-body cursor-pointer relative overflow-hidden bg-transparent text-on-surface-muted border-none font-medium transition-hover hover:text-on-surface leading-[1.3]"
    type="button"
  >
    {{ t('welcome.hero.learnMore') }}
  </button>
</template>

<script setup lang="ts">
import { useI18n} from "vue-i18n";

const { t } = useI18n();
</script>
