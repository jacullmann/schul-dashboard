<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({
  title: () => `${t('legal.imprint.title')} – schul-dashboard`,
  description: () => t('legal.imprint.description'),
  robots: 'noindex, follow',
});
</script>

<template>
  <div class="page-wrapper">
    <div class="page-inner">
      <NuxtLink to="/" class="back-link">
        <span aria-hidden="true">←</span> {{ t('back') }}
      </NuxtLink>

      <h1 class="page-title">{{ t('legal.imprint.title') }}</h1>
      <p class="page-description">{{ t('legal.imprint.description') }}</p>

      <section class="section">
        <h2 class="section-title">{{ t('legal.imprint.responsible') }}</h2>
        <address class="address-block">
          <!-- TODO: Replace with your actual name and address -->
          schul-dashboard<br />
          [Name]<br />
          [Street Address]<br />
          [Postal Code] [City]<br />
          Germany
        </address>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.imprint.contact') }}</h2>
        <p class="body-text">
          E-Mail:
          <a href="mailto:contact@schul-dashboard.com" class="inline-link">
            contact@schul-dashboard.com
          </a>
        </p>
      </section>

      <section class="section">
        <h2 class="section-title">{{ t('legal.imprint.disclaimer.title') }}</h2>
        <p class="body-text">{{ t('legal.imprint.disclaimer.text') }}</p>
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

.address-block {
  font-size: var(--text-body);
  color: var(--color-on-surface-muted);
  line-height: 1.8;
  font-style: normal;
}

.inline-link {
  color: var(--color-on-surface);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: opacity var(--duration-hover) var(--ease-hover);
}

.inline-link:hover {
  opacity: 0.75;
}
</style>
