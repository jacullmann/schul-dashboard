<script setup lang="ts">
import { ref } from "vue";
import ImageComparison from "@/modules/welcome/components/ImageComparison.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { tm } = useI18n();

const rootEl = ref<HTMLElement | null>(null);

defineExpose({
  el: rootEl
});
</script>

<template>
  <section ref="rootEl" class="info-section">

    <div class="info-container">
      <h3 class="info-title" v-html="t('welcome.comparison.headline')" />
      <ImageComparison />
      <div class="small-print">
        {{ t('welcome.comparison.attribution') }}
      </div>
    </div>

    <div class="info-container">
      <h3 class="info-title" v-html="t('welcome.reasons.byStudentsForStudents')" />
      <h3 class="info-title">
        {{ t('welcome.reasons.why') }}
      </h3>
      <div class="info-promises">
        <template v-for="(section, index) in tm('welcome.reasons.reasons')" :key="index">
          <div>
            <b>{{ section.number }}</b>
            {{ section.text }}
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.info-section {
  display:flex;
  flex-direction: column;
  gap: 64px;
  max-width: 800px;
  padding-block: 5rem;
}

.info-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-title {
  font-family: var(--font-sans), sans-serif;
  font-size: 1.4rem;
  font-weight: 400;
  margin: 0;
}

b {
  font-weight: 700;
}

.small-print {
  font-size: 0.7rem;
  color: var(--color-on-surface-muted);
  margin: 0;
}

.info-promises {
  font-family: var(--font-display), sans-serif;
  font-size: 32px;
  line-height: 48px;
  color: var(--color-on-surface);
  font-weight: 500;
}
</style>