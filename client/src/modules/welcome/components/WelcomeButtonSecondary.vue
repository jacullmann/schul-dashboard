<template>
  <button class="secondary-btn" type="button">
    {{ t('welcome.hero.learnMore') }}
  </button>
</template>

<script setup lang="ts">
import { useI18n} from "vue-i18n";

const { t } = useI18n();
</script>

<style scoped>
.secondary-btn {
  padding: 10px 16px;
  font-size: var(--text-body);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background: none;
  color: var(--color-sub);
  border: none;
  font-weight: 500;
}
.secondary-btn:hover {
  color: var(--color-on-surface);
}
</style>