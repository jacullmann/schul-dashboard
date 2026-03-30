<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ExternalLink } from '@lucide/vue';
import { useTheme, applyTheme, type ThemeMode } from '~/composables/useTheme';

const { t, locale } = useI18n();
const { selectedThemeMode } = useTheme();
const { $setLocale } = useNuxtApp();

const themeOptions = computed(() => [
  { value: 'system', label: t('theme.system') },
  { value: 'dark', label: t('theme.dark') },
  { value: 'light', label: t('theme.light') },
]);

const localeOptions = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

function setTheme(e: Event) {
  applyTheme((e.target as HTMLSelectElement).value as ThemeMode);
}

function setLocale(e: Event) {
  ($setLocale as (l: string) => void)((e.target as HTMLSelectElement).value);
  locale.value = (e.target as HTMLSelectElement).value as 'de' | 'en';
}
</script>

<template>
  <footer class="footer">
    <div class="footer-grid">
      <!-- Disclaimer -->
      <div class="footer-section">
        <h3 class="footer-title">{{ t('footer.disclaimer.title') }}</h3>
        <p class="footer-text">{{ t('footer.disclaimer.text') }}</p>
      </div>

      <!-- Navigation -->
      <div class="footer-section">
        <h3 class="footer-title">Navigation</h3>
        <nav class="footer-links">
          <NuxtLink to="/" class="footer-link">{{ t('footer.navigation.landingPage') }}</NuxtLink>
          <NuxtLink to="/legal/imprint" class="footer-link">{{ t('footer.navigation.imprint') }}</NuxtLink>
          <a
            href="https://stats.uptimerobot.com/m8tUrWG3Zz"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-link footer-link--external"
          >
            {{ t('footer.navigation.status') }}
            <ExternalLink :size="14" />
          </a>
        </nav>
      </div>

      <!-- Theme -->
      <div class="footer-section">
        <h3 class="footer-title">{{ t('footer.design') }}</h3>
        <select class="footer-select" :value="selectedThemeMode" @change="setTheme">
          <option v-for="opt in themeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Language -->
      <div class="footer-section">
        <h3 class="footer-title">{{ t('footer.language') }}</h3>
        <select class="footer-select" :value="locale" @change="setLocale">
          <option v-for="opt in localeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="footer-bottom">
      <p class="footer-byline">{{ t('footer.byStudentsForStudents') }}</p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: var(--color-canvas);
  border-top: 1px solid var(--color-canvas-border);
  padding: 32px 16px 0;
  color: var(--color-on-surface-muted);
  font-size: var(--text-sub);
}

.footer-grid {
  max-width: 1300px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
}

@media (max-width: 1024px) {
  .footer-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

.footer-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-title {
  font-size: var(--text-btn);
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 0 0 4px;
  font-family: var(--font-sans), sans-serif;
}

.footer-text {
  font-size: var(--text-footnote);
  color: var(--color-on-surface-muted);
  margin: 0;
  line-height: 1.5;
}

.footer-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.footer-link {
  color: var(--color-on-surface-muted);
  text-decoration: none;
  transition: color 0.1s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.footer-link:hover {
  color: var(--color-on-surface);
}

.footer-select {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-md);
  color: var(--color-on-surface);
  padding: 6px 10px;
  font-size: var(--text-btn);
  cursor: pointer;
  width: 100%;
  max-width: 180px;
}

.footer-bottom {
  max-width: 1300px;
  margin: 24px auto 0;
  padding: 16px 0;
  border-top: 1px solid var(--color-canvas-border);
}

.footer-byline {
  font-size: var(--text-footnote);
  color: var(--color-on-surface-muted);
  margin: 0;
  text-align: center;
}
</style>
