<template>
  <button
    class="px-4 py-2 rounded-md text-body cursor-pointer relative overflow-hidden bg-action text-on-action border-none font-semibold transition-hover hover:bg-action-hover leading-[1.3]"
    type="button"
  >
    {{ t('welcome.hero.cta') }}
  </button>
</template>

<script setup lang="ts">
import { useI18n} from "vue-i18n";

const { t } = useI18n();
</script>
