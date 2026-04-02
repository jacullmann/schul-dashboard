<script setup lang="ts">
const { t, tm } = useI18n();

type FeatureItem = { title: string; description: string };

const icons = ['0€', '🚫', '🔒', '👥', '✅', '📅'];
</script>

<template>
  <section class="features-section">
    <div class="features-header">
      <h2 class="features-title">{{ t('features.title') }}</h2>
      <p class="features-subtitle">{{ t('features.subtitle') }}</p>
    </div>

    <div class="features-grid">
      <div
        v-for="(feature, i) in (tm('features.items') as FeatureItem[])"
        :key="i"
        class="feature-card"
      >
        <span class="feature-icon" aria-hidden="true">{{ icons[i] }}</span>
        <h3 class="feature-title">{{ feature.title }}</h3>
        <p class="feature-description">{{ feature.description }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features-section {
  width: 100%;
  max-width: 1100px;
  padding-block: 5rem;
  margin: 0 auto;
}

.features-header {
  text-align: center;
  margin-bottom: 48px;
}

.features-title {
  font-size: var(--text-h1);
  font-weight: 700;
  color: var(--color-on-surface);
  margin: 0 0 12px;
  font-family: var(--font-display), sans-serif;
}

.features-subtitle {
  font-size: 1.125rem;
  color: var(--color-on-surface-muted);
  margin: 0;
  line-height: 1.6;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.feature-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-xl);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color var(--duration-hover) var(--ease-hover),
    background-color var(--duration-hover) var(--ease-hover);
}

.feature-card:hover {
  border-color: var(--color-surface-hover-border);
  background-color: var(--color-surface-hover-subtle);
}

.feature-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.feature-title {
  font-size: var(--text-title);
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 0;
  font-family: var(--font-display), sans-serif;
}

.feature-description {
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  line-height: 1.65;
  margin: 0;
}

@media (max-width: 900px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 580px) {
  .features-grid { grid-template-columns: 1fr; }
  .features-section { padding-block: 3rem; }
}
</style>
