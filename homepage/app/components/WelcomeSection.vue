<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t, tm } = useI18n();
</script>

<template>
  <section id="welcome-section" class="info-section">
    <div class="info-container">
      <h3 class="info-title" v-html="t('comparison.headline')" />
      <ImageComparison />
      <p class="small-print">{{ t('comparison.attribution') }}</p>
    </div>

    <div class="info-container">
      <h3 class="info-title" v-html="t('reasons.byStudentsForStudents')" />
      <h3 class="info-title">{{ t('reasons.why') }}</h3>
      <div class="info-promises">
        <div v-for="(reason, i) in (tm('reasons.reasons') as Array<{ number: string; text: string }>)" :key="i">
          <b>{{ reason.number }}</b>{{ reason.text }}
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.info-section {
  display: flex;
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

b {
  font-weight: 700;
}
</style>
