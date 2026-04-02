<script setup lang="ts">
import { Mail, GitFork, Clock } from '@lucide/vue';

const { t } = useI18n();

useSeoMeta({
  title: () => `${t('contact.title')} – schul-dashboard`,
  description: () => t('contact.description'),
  ogTitle: () => `${t('contact.title')} – schul-dashboard`,
  ogDescription: () => t('contact.description'),
});
</script>

<template>
  <div class="page-wrapper">
    <div class="page-inner">
      <NuxtLink to="/" class="back-link">
        <span aria-hidden="true">←</span> {{ t('back') }}
      </NuxtLink>

      <h1 class="page-title">{{ t('contact.title') }}</h1>
      <p class="page-description">{{ t('contact.description') }}</p>

      <div class="cards-grid">
        <!-- Intro card -->
        <div class="card card--full">
          <p class="card-text">{{ t('contact.sections.getInTouch.text') }}</p>
        </div>

        <!-- Email -->
        <a
          :href="`mailto:${t('contact.sections.email.value')}`"
          class="card card--link"
          rel="noopener"
        >
          <div class="card-icon">
            <Mail :size="20" />
          </div>
          <div>
            <h2 class="card-title">{{ t('contact.sections.email.title') }}</h2>
            <p class="card-text card-text--highlight">{{ t('contact.sections.email.value') }}</p>
          </div>
        </a>

        <!-- GitHub -->
        <a
          href="https://github.com/schul-dashboard"
          target="_blank"
          rel="noopener noreferrer"
          class="card card--link"
        >
          <div class="card-icon">
            <GitFork :size="20" />
          </div>
          <div>
            <h2 class="card-title">{{ t('contact.sections.github.title') }}</h2>
            <p class="card-text">{{ t('contact.sections.github.text') }}</p>
            <span class="card-action">{{ t('contact.sections.github.action') }} →</span>
          </div>
        </a>

        <!-- Response time -->
        <div class="card">
          <div class="card-icon">
            <Clock :size="20" />
          </div>
          <div>
            <h2 class="card-title">{{ t('contact.sections.response.title') }}</h2>
            <p class="card-text">{{ t('contact.sections.response.text') }}</p>
          </div>
        </div>
      </div>
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

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-xl);
  padding: 20px 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  text-decoration: none;
  transition: border-color var(--duration-hover) var(--ease-hover),
    background-color var(--duration-hover) var(--ease-hover);
}

.card--full {
  grid-column: 1 / -1;
  display: block;
}

.card--link:hover {
  border-color: var(--color-surface-hover-border);
  background-color: var(--color-surface-hover-subtle);
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--color-canvas);
  border: 1px solid var(--color-canvas-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-on-surface-muted);
  flex-shrink: 0;
}

.card-title {
  font-size: var(--text-title);
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 0 0 4px;
}

.card-text {
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  line-height: 1.6;
  margin: 0;
}

.card-text--highlight {
  color: var(--color-on-surface);
  font-weight: 500;
}

.card-action {
  display: inline-block;
  margin-top: 8px;
  font-size: var(--text-sub);
  font-weight: 500;
  color: var(--color-on-surface);
}

@media (max-width: 540px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }

  .card--full {
    grid-column: 1;
  }
}
</style>
