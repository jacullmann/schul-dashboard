<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps<{ onMoreInfoClick: () => void }>();

const config = useRuntimeConfig();

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(new Date(dateString));
}
</script>

<template>
  <div class="welcome-section">
    <!-- Text -->
    <div class="text-content">
      <h1 class="headline-serif">{{ t('hero.headlineSerif') }}</h1>
      <h1 class="headline-sans" v-html="t('hero.headlineSans')" />
      <p class="subline">
        {{ t('hero.subline') }}
        <span class="highlight-wrap">
          <span class="line-span">{{ t('hero.sublineHighlight') }}</span>
        </span>.
      </p>

      <div class="action-buttons">
        <a :href="config.public.loginUrl">
          <WelcomeButtonPrimary />
        </a>
        <WelcomeButtonSecondary @click="onMoreInfoClick" />
      </div>
    </div>

    <!-- Visual demo -->
    <div class="visual-container">
      <div class="example-wrapper">
        <div class="example-dashboard">
          <!-- Demo card 1: checked -->
          <div class="demo-card">
            <span class="demo-checkbox checked" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <polyline points="2 6 5 9 10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="demo-card-body">
              <span class="demo-title">{{ t('hero.items[0].title') }}</span>
            </div>
          </div>

          <!-- Demo card 2 (desktop only) -->
          <div class="demo-card only-desktop">
            <span class="demo-checkbox" aria-hidden="true" />
            <div class="demo-card-body">
              <span class="demo-title">{{ t('hero.items[1].title') }}</span>
              <span class="demo-badge">Erdkunde · {{ formatDate('2026-03-07') }}</span>
            </div>
          </div>

          <!-- Demo card 3 -->
          <div class="demo-card">
            <span class="demo-checkbox" aria-hidden="true" />
            <div class="demo-card-body">
              <span class="demo-title">{{ t('hero.items[2].title') }}</span>
              <span class="demo-badge">Mathe · {{ formatDate('2026-03-08') }}</span>
              <span class="demo-body">{{ t('hero.items[2].text') }}</span>
            </div>
          </div>

          <div class="item-card-vanishing" aria-hidden="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  max-width: 1600px;
  width: 100%;
  min-height: calc(100vh - 70px - 50px - 2rem);
  gap: 32px;
  padding: 64px;
  margin: 0 auto 64px;
}

.text-content {
  flex: 1;
  color: var(--color-on-surface);
  container-type: inline-size;
}

.headline-serif,
.headline-sans {
  font-size: 13.34cqw;
  line-height: 1.1;
  margin-bottom: 0;
  text-align: left;
}

.headline-serif {
  font-weight: 500;
  letter-spacing: -0.02em;
  font-family: 'Noto Serif', serif;
  font-size-adjust: 0.5;
}

.headline-sans {
  font-weight: 900;
  letter-spacing: -0.01em;
  font-family: var(--font-sans), sans-serif;
}

:deep(b) {
  background: var(--background-image-bismuth);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.subline {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 32px;
  margin-top: 16px;
  color: var(--color-on-surface-muted);
}

.highlight-wrap {
  font-weight: 600;
  color: var(--color-on-surface);
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 32px;
}

/* Visual section */
.visual-container {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.example-wrapper {
  width: 100%;
  max-width: 640px;
}

.example-dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.demo-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-xl);
  padding: 12px 16px;
}

.demo-checkbox {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--color-on-surface-muted);
  flex-shrink: 0;
  margin-top: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.demo-checkbox.checked {
  background: var(--color-action);
  border-color: var(--color-action);
  color: var(--color-on-action);
}

.demo-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.demo-title {
  font-size: 1.125rem;
  font-family: var(--font-display), sans-serif;
  color: var(--color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.demo-badge {
  color: var(--color-on-surface-muted);
  font-size: var(--text-body);
}

.demo-body {
  color: var(--color-on-surface);
  font-size: 16px;
  word-break: break-word;
}

.item-card-vanishing {
  background: linear-gradient(var(--color-surface) 0%, transparent 100%);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  min-height: 30px;
}

/* Responsive */
@media (max-width: 1200px) {
  .welcome-section {
    flex-direction: column;
    padding: 0;
    gap: 0;
    min-height: auto;
  }

  .text-content {
    width: 100%;
    order: 2;
  }

  .visual-container {
    order: 1;
    justify-content: center;
  }

  .headline-serif,
  .headline-sans {
    font-size: 6rem;
    text-align: center;
  }

  .subline,
  .action-buttons {
    text-align: center;
    justify-content: center;
  }
}

@media (max-width: 900px) {
  .headline-serif,
  .headline-sans {
    font-size: 13.34cqw;
  }
}

@media (max-width: 576px) {
  .only-desktop {
    display: none;
  }

  .headline-serif {
    margin-top: -24px;
  }
}
</style>
