<template>
  <button class="primary-btn" type="button">
    {{ t('welcome.hero.cta') }}
  </button>
</template>

<script setup lang="ts">
import { useI18n} from "vue-i18n";

const { t } = useI18n();
</script>

<style scoped>
.primary-btn {
  padding: 10px 16px;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-body);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background: var(--text);
  color: var(--bg);
  border: none;
  font-weight: 600;
}
.primary-btn:hover {
  background: var(--action-hover);
}
</style>