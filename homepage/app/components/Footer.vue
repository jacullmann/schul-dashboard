<script setup lang="ts">
import { ExternalLink } from '@lucide/vue';
const { t } = useI18n();
const localePath = useLocalePath();

</script>

<template>
  <footer class="w-full bg-canvas border-t border-surface-border text-on-surface-muted">
    <!-- Main Footer -->
    <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 py-16 md:py-12">
      <div class="grid grid-cols-4 md:grid-cols-2 sm:grid-cols-1 gap-10 lg:gap-8 mb-12">
        <!-- Brand Column -->
        <div class="flex flex-col gap-3">
          <NuxtLink
            :to="localePath('index')"
            class="inline-flex items-center gap-2 no-underline w-fit group"
            aria-label="schul-dashboard home"
          >
            <img src="/favicon.svg" alt="" class="w-8 h-8" />
            <span class="font-bold text-on-surface font-display group-hover:opacity-80 transition-opacity">schul-dashboard</span>
          </NuxtLink>
          <p class="text-footnote text-on-surface-muted leading-[1.5] max-w-[200px]">
            {{ t('footer.tagline') }}
          </p>
        </div>

        <!-- Navigation Links -->
        <div class="flex flex-col gap-3">
          <h3 class="text-btn font-semibold text-on-surface m-0 font-sans">{{ t('footer.navigation.title') }}</h3>
          <nav class="flex flex-col gap-2" aria-label="Footer navigation">
            <NuxtLink :to="localePath('index')" class="text-footnote text-on-surface-muted no-underline transition-colors hover:text-on-surface">
              {{ t('footer.navigation.home') }}
            </NuxtLink>
            <NuxtLink :to="localePath('features')" class="text-footnote text-on-surface-muted no-underline transition-colors hover:text-on-surface">
              {{ t('footer.navigation.features') }}
            </NuxtLink>
            <NuxtLink :to="localePath('pricing')" class="text-footnote text-on-surface-muted no-underline transition-colors hover:text-on-surface">
              {{ t('footer.navigation.pricing') }}
            </NuxtLink>
            <NuxtLink :to="localePath('about')" class="text-footnote text-on-surface-muted no-underline transition-colors hover:text-on-surface">
              {{ t('footer.navigation.about') }}
            </NuxtLink>
          </nav>
        </div>

        <!-- Legal Links -->
        <div class="flex flex-col gap-3">
          <h3 class="text-btn font-semibold text-on-surface m-0 font-sans">{{ t('footer.legal.title') }}</h3>
          <nav class="flex flex-col gap-2" aria-label="Legal navigation">
            <NuxtLink :to="localePath('legal-imprint')" class="text-footnote text-on-surface-muted no-underline transition-colors hover:text-on-surface">
              {{ t('footer.legal.imprint') }}
            </NuxtLink>
            <NuxtLink :to="localePath('legal-privacy-policy')" class="text-footnote text-on-surface-muted no-underline transition-colors hover:text-on-surface">
              {{ t('footer.legal.privacy') }}
            </NuxtLink>
            <NuxtLink :to="localePath('legal-terms')" class="text-footnote text-on-surface-muted no-underline transition-colors hover:text-on-surface">
              {{ t('footer.legal.terms') }}
            </NuxtLink>
          </nav>
        </div>

        <!-- Theme & Language -->
        <div class="flex flex-col gap-6">
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
      </div>

      <!-- Divider -->
      <div class="border-t border-surface-border my-8" />

      <!-- Bottom Bar -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-4 text-footnote">
        <p class="text-on-surface-muted m-0">
          &copy; {{ new Date().getFullYear() }} schul-dashboard. {{ t('footer.rights') }}
        </p>
        <a
          href="https://status.schul-dashboard.com"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-on-surface-muted no-underline hover:text-on-surface transition-colors"
        >
          {{ t('footer.status') }}
          <ExternalLink :size="14" aria-hidden="true" />
        </a>
      </div>
    </div>
  </footer>
</template>

