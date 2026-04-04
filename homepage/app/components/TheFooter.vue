<script setup lang="ts">
import { computed } from 'vue';
import { ExternalLink } from '@lucide/vue';
import { useTheme, type ThemeMode } from '~/composables/useTheme';

const { t, locale, setLocale } = useI18n();
const { selectedThemeMode, setTheme } = useTheme();

const themeOptions = computed(() => [
  { value: 'system' as ThemeMode, label: t('theme.system') },
  { value: 'dark'   as ThemeMode, label: t('theme.dark') },
  { value: 'light'  as ThemeMode, label: t('theme.light') },
]);

const localeOptions = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
] as const;

function handleThemeChange(e: Event): void {
  setTheme((e.target as HTMLSelectElement).value as ThemeMode);
}

async function handleLocaleChange(e: Event): Promise<void> {
  await setLocale((e.target as HTMLSelectElement).value as 'de' | 'en');
}
</script>

<template>
  <footer class="bg-canvas border-t border-canvas-border text-on-surface-muted text-sub">
    <div class="max-w-[1300px] mx-auto px-6 py-12 md:py-8 md:px-4 md:pb-6 grid grid-cols-4 md:grid-cols-2 sm:grid-cols-1 gap-10 lg:gap-6">
      <!-- Brand column -->
      <div class="flex flex-col gap-2.5">
        <NuxtLink to="/" class="inline-flex items-center gap-2 no-underline w-fit" aria-label="schul-dashboard home">
          <img src="/favicon.svg" alt="logo" />
          <span class="text-body font-bold text-on-surface font-display">schul-dashboard</span>
        </NuxtLink>
        <p class="text-footnote text-on-surface-muted m-0 leading-[1.5] max-w-[220px]">{{ t('footer.byStudentsForStudents') }}</p>
      </div>

      <!-- Navigation -->
      <div class="flex flex-col gap-1.5">
        <h3 class="text-btn font-semibold text-on-surface m-0 mb-1.5 font-sans">Navigation</h3>
        <nav class="flex flex-col gap-1.25" aria-label="Footer navigation">
          <NuxtLink to="/" class="text-on-surface-muted no-underline text-sub transition-colors hover:text-on-surface inline-flex items-center gap-1">{{ t('footer.navigation.landingPage') }}</NuxtLink>
          <NuxtLink to="/about" class="text-on-surface-muted no-underline text-sub transition-colors hover:text-on-surface inline-flex items-center gap-1">{{ t('footer.navigation.about') }}</NuxtLink>
          <NuxtLink to="/contact" class="text-on-surface-muted no-underline text-sub transition-colors hover:text-on-surface inline-flex items-center gap-1">{{ t('footer.navigation.contact') }}</NuxtLink>
          <NuxtLink to="/legal/imprint" class="text-on-surface-muted no-underline text-sub transition-colors hover:text-on-surface inline-flex items-center gap-1">{{ t('footer.navigation.imprint') }}</NuxtLink>
          <NuxtLink to="/legal/privacy-policy" class="text-on-surface-muted no-underline text-sub transition-colors hover:text-on-surface inline-flex items-center gap-1">{{ t('footer.navigation.privacy') }}</NuxtLink>
          <NuxtLink to="/legal/terms" class="text-on-surface-muted no-underline text-sub transition-colors hover:text-on-surface inline-flex items-center gap-1">{{ t('footer.navigation.terms') }}</NuxtLink>
          <a
              href="https://stats.uptimerobot.com/m8tUrWG3Zz"
              target="_blank"
              rel="noopener noreferrer"
              class="text-on-surface-muted no-underline text-sub transition-colors hover:text-on-surface inline-flex items-center gap-1"
          >
            {{ t('footer.navigation.status') }}
            <ExternalLink :size="13" aria-hidden="true" />
          </a>
        </nav>
      </div>

      <!-- Disclaimer -->
      <div class="flex flex-col gap-1.5">
        <h3 class="text-btn font-semibold text-on-surface m-0 mb-1.5 font-sans">{{ t('footer.disclaimer.title') }}</h3>
        <p class="text-footnote text-on-surface-muted m-0 leading-[1.55]">{{ t('footer.disclaimer.text') }}</p>
      </div>

      <!-- Preferences -->
      <div class="flex flex-col gap-1.5">
        <h3 class="text-btn font-semibold text-on-surface m-0 mb-1.5 font-sans">{{ t('footer.design') }}</h3>
        <select
            class="bg-surface border border-surface-border rounded-md text-on-surface px-2.5 py-1.5 text-btn cursor-pointer w-full max-w-[180px] font-sans transition-colors hover:border-surface-hover-border"
            :value="selectedThemeMode"
            @change="handleThemeChange"
        >
          <option v-for="opt in themeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <h3 class="text-btn font-semibold text-on-surface m-0 mt-5 mb-1.5 font-sans">{{ t('footer.language') }}</h3>
        <select
            class="bg-surface border border-surface-border rounded-md text-on-surface px-2.5 py-1.5 text-btn cursor-pointer w-full max-w-[180px] font-sans transition-colors hover:border-surface-hover-border"
            :value="locale"
            @change="handleLocaleChange"
        >
          <option v-for="opt in localeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="max-w-[1300px] mx-auto px-6 md:px-4 py-4 border-t border-canvas-border">
      <p class="text-footnote text-on-surface-muted m-0 text-center">
        &copy; {{ new Date().getFullYear() }} schul-dashboard
      </p>
    </div>
  </footer>
</template>