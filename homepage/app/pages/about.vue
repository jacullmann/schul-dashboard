<script setup lang="ts">
const { t, tm } = useI18n();

type ValueItem = { title: string; description: string };

useSeoMeta({
  title: () => `${t('about.title')} – schul-dashboard`,
  description: () => t('about.description'),
  ogTitle: () => `${t('about.title')} – schul-dashboard`,
  ogDescription: () => t('about.description'),
});
</script>

<template>
  <div class="about-page">

    <!-- Hero -->
    <section class="about-hero">
      <span class="badge">{{ t('about.hero.badge') }}</span>
      <h1 class="about-heading">{{ t('about.hero.heading') }}</h1>
      <p class="about-subheading">{{ t('about.hero.subheading') }}</p>
    </section>

    <div class="content-wrapper">

      <!-- Mission + Story side by side -->
      <div class="two-col">
        <div class="prose-card">
          <h2 class="section-title">{{ t('about.mission.title') }}</h2>
          <p class="prose-text">{{ t('about.mission.text') }}</p>
        </div>
        <div class="prose-card">
          <h2 class="section-title">{{ t('about.story.title') }}</h2>
          <p class="prose-text">{{ t('about.story.text') }}</p>
        </div>
      </div>

      <!-- Values -->
      <section class="values-section">
        <h2 class="section-title section-title--center">{{ t('about.values.title') }}</h2>
        <div class="values-grid">
          <div
            v-for="(val, i) in (tm('about.values.items') as ValueItem[])"
            :key="i"
            class="value-card"
          >
            <h3 class="value-title">{{ val.title }}</h3>
            <p class="value-description">{{ val.description }}</p>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="cta-section">
        <p class="cta-text">{{ t('hero.subline') }} <strong>{{ t('hero.sublineHighlight') }}</strong>.</p>
        <NuxtLink to="/contact" class="cta-secondary">{{ t('nav.contact') }}</NuxtLink>
      </section>

    </div>
  </div>
</template>

<style scoped>
.about-page {
  width: 100%;
  padding-bottom: 96px;
}

/* Hero */
.about-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 80px 24px 64px;
  max-width: 760px;
  margin: 0 auto;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  font-size: var(--text-btn);
  font-weight: 600;
  color: var(--color-on-surface-muted);
  margin-bottom: 20px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.about-heading {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  color: var(--color-on-surface);
  line-height: 1.15;
  margin: 0 0 20px;
  letter-spacing: -0.02em;
}

.about-subheading {
  font-size: 1.2rem;
  color: var(--color-on-surface-muted);
  line-height: 1.7;
  margin: 0;
  max-width: 560px;
}

/* Content */
.content-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 64px;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.prose-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-xl);
  padding: 32px;
}

.section-title {
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--color-on-surface);
  margin: 0 0 16px;
  font-family: var(--font-display), sans-serif;
}

.section-title--center {
  text-align: center;
  margin-bottom: 32px;
}

.prose-text {
  font-size: var(--text-body);
  color: var(--color-on-surface-muted);
  line-height: 1.75;
  margin: 0;
}

/* Values */
.values-section {
  display: flex;
  flex-direction: column;
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.value-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-xl);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.value-title {
  font-size: var(--text-title);
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 0;
}

.value-description {
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  line-height: 1.65;
  margin: 0;
}

/* CTA */
.cta-section {
  text-align: center;
  padding: 48px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-2xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.cta-text {
  font-size: 1.25rem;
  color: var(--color-on-surface-muted);
  margin: 0;
  line-height: 1.6;
}

.cta-text strong {
  color: var(--color-on-surface);
}

.cta-secondary {
  display: inline-flex;
  align-items: center;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  background: var(--color-action);
  color: var(--color-on-action);
  font-size: var(--text-body);
  font-weight: 600;
  text-decoration: none;
  transition: background-color var(--duration-hover) var(--ease-hover);
}

.cta-secondary:hover {
  background-color: var(--color-action-hover);
}

/* Responsive */
@media (max-width: 900px) {
  .values-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 700px) {
  .two-col { grid-template-columns: 1fr; }
  .values-grid { grid-template-columns: 1fr; }
  .about-hero { padding: 48px 16px 40px; }
}
</style>
