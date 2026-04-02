<script setup lang="ts">
const { t, tm } = useI18n();

useSeoMeta({
  title: () => `${t('legal.privacy.title')} – schul-dashboard`,
  description: () => t('legal.privacy.description'),
  robots: 'noindex, follow',
});
</script>

<template>
  <div class="page-wrapper">
    <div class="page-inner">
      <NuxtLink to="/" class="back-link">
        <span aria-hidden="true">←</span> {{ t('back') }}
      </NuxtLink>

      <h1 class="page-title">{{ t('legal.privacy.title') }}</h1>
      <p class="page-description">{{ t('legal.privacy.description') }}</p>

      <section class="section">
        <h2 class="section-title">{{ t('legal.privacy.intro.title') }}</h2>
        <p class="body-text">{{ t('legal.privacy.intro.text') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.privacy.controller.title') }}</h2>
        <p class="body-text">{{ t('legal.privacy.controller.text') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.privacy.dataCollected.title') }}</h2>
        <ul class="list">
          <li
            v-for="(item, i) in (tm('legal.privacy.dataCollected.items') as string[])"
            :key="i"
            class="list-item"
          >
            {{ item }}
          </li>
        </ul>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.privacy.purpose.title') }}</h2>
        <p class="body-text">{{ t('legal.privacy.purpose.text') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.privacy.retention.title') }}</h2>
        <p class="body-text">{{ t('legal.privacy.retention.text') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.privacy.rights.title') }}</h2>
        <p class="body-text">{{ t('legal.privacy.rights.intro') }}</p>
        <ul class="list">
          <li
            v-for="(item, i) in (tm('legal.privacy.rights.items') as string[])"
            :key="i"
            class="list-item"
          >
            {{ item }}
          </li>
        </ul>
        <p class="body-text body-text--spaced">{{ t('legal.privacy.rights.contact') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.privacy.cookies.title') }}</h2>
        <p class="body-text">{{ t('legal.privacy.cookies.text') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.privacy.security.title') }}</h2>
        <p class="body-text">{{ t('legal.privacy.security.text') }}</p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.privacy.changes.title') }}</h2>
        <p class="body-text">{{ t('legal.privacy.changes.text') }}</p>
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

.body-text--spaced {
  margin-top: 12px;
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
