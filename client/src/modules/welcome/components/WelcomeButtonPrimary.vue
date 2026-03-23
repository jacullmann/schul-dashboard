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
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background: var(--color-on-surface);
  color: var(--color-canvas);
  border: none;
  font-weight: 600;
}
.primary-btn:hover {
  background: var(--color-action-hover);
}
</style>