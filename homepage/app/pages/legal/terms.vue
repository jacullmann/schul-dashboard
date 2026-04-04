<script setup lang="ts">
const { t } = useI18n();

const accountItems = [
  { key: 'legal.terms.account.item0' },
  { key: 'legal.terms.account.item1' },
  { key: 'legal.terms.account.item2' },
  { key: 'legal.terms.account.item3' }
];

const conductItems = [
  { key: 'legal.terms.conduct.item0' },
  { key: 'legal.terms.conduct.item1' },
  { key: 'legal.terms.conduct.item2' },
  { key: 'legal.terms.conduct.item3' }
];

useSeoMeta({
  title: () => `${t('legal.terms.title')} – schul-dashboard`,
  description: () => t('legal.terms.description'),
  robots: 'noindex, follow',
});
</script>

<template>
  <div class="page-wrapper">
    <div class="page-inner">
      <NuxtLink to="/" class="back-link">
        <span aria-hidden="true">←</span> {{ t('back') }}
      </NuxtLink>

      <h1 class="page-title">{{ t('legal.terms.title') }}</h1>
      <p class="page-description">{{ t('legal.terms.description') }}</p>

      <section class="section">
        <h2 class="section-title">{{ t('legal.terms.acceptance.title') }}</h2>
        <p class="body-text">{{ t('legal.terms.acceptance.text') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.terms.service.title') }}</h2>
        <p class="body-text">{{ t('legal.terms.service.text') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.terms.account.title') }}</h2>
        <ul class="list">
          <li
            v-for="item in accountItems"
            :key="item.key"
            class="list-item"
          >
            {{ t(item.key) }}
          </li>
        </ul>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.terms.conduct.title') }}</h2>
        <p class="body-text">{{ t('legal.terms.conduct.intro') }}</p>
        <ul class="list">
          <li
            v-for="item in conductItems"
            :key="item.key"
            class="list-item"
          >
            {{ t(item.key) }}
          </li>
        </ul>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.terms.termination.title') }}</h2>
        <p class="body-text">{{ t('legal.terms.termination.text') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.terms.liability.title') }}</h2>
        <p class="body-text">{{ t('legal.terms.liability.text') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.terms.changes.title') }}</h2>
        <p class="body-text">{{ t('legal.terms.changes.text') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.terms.governing.title') }}</h2>
        <p class="body-text">{{ t('legal.terms.governing.text') }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper {
  width: 100%;
  padding: 48px 16px 96px;
}

.page-inner {
  max-width: 720px;
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  text-decoration: none;
  margin-bottom: 32px;
  transition: color var(--duration-hover) var(--ease-hover);
}

.back-link:hover {
  color: var(--color-on-surface);
}

.page-title {
  font-size: var(--text-h1);
  font-weight: 700;
  color: var(--color-on-surface);
  margin: 0 0 8px;
}

.page-description {
  font-size: var(--text-body);
  color: var(--color-on-surface-muted);
  margin: 0 0 40px;
}

.section {
  margin-bottom: 36px;
  padding-bottom: 36px;
  border-bottom: 1px solid var(--color-canvas-border);
}

.section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-title {
  font-size: var(--text-h3);
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 0 0 12px;
}

.body-text {
  font-size: var(--text-body);
  color: var(--color-on-surface-muted);
  line-height: 1.7;
  margin: 0;
}

.list {
  margin: 8px 0 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.list-item {
  font-size: var(--text-body);
  color: var(--color-on-surface-muted);
  line-height: 1.6;
}
</style>
