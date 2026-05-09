<script setup lang="ts">
import { ExternalLink } from '@lucide/vue';

const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <footer class="w-full bg-canvas border-t border-surface-border">
    <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 py-14 md:py-10">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
        <!-- Brand -->
        <div class="flex flex-col gap-3">
          <NuxtLink
            :to="localePath('index')"
            class="inline-flex items-center gap-2 w-fit group"
            aria-label="schul-dashboard home"
          >
            <img src="/favicon.svg" alt="" class="w-7 h-7" />
            <span
              class="font-bold text-on-ghost font-display text-xl group-hover:underline underline-offset-2 decoration-1.5 decoration-skip-ink transition-opacity"
            >
              schul-dashboard
            </span>
          </NuxtLink>
          <p class="text-xs text-on-ghost-muted leading-[1.6] max-w-[200px] m-0">
            {{ t('footer.tagline') }}
          </p>
        </div>

        <!-- Navigation -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-on-ghost m-0">
            {{ t('footer.navigation.title') }}
          </p>
          <nav class="flex flex-col gap-2" aria-label="Footer navigation">
            <BaseLink :to="localePath('index')">
              {{ t('footer.navigation.home') }}
            </BaseLink>
            <BaseLink :to="localePath('features')">
              {{ t('footer.navigation.features') }}
            </BaseLink>
            <BaseLink :to="localePath('product')">
              {{ t('footer.navigation.product') }}
            </BaseLink>
            <BaseLink :to="localePath('about')">
              {{ t('footer.navigation.about') }}
            </BaseLink>
            <BaseLink :to="localePath('contact')">
              {{ t('footer.navigation.contact') }}
            </BaseLink>
          </nav>
        </div>

        <!-- Legal -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-on-ghost m-0">{{ t('footer.legal.title') }}</p>
          <nav class="flex flex-col gap-2" aria-label="Legal navigation">
            <BaseLink :to="localePath('legal-imprint')">
              {{ t('footer.legal.imprint') }}
            </BaseLink>
            <BaseLink :to="localePath('legal-privacy-policy')">
              {{ t('footer.legal.privacy') }}
            </BaseLink>
            <BaseLink :to="localePath('legal-terms')">
              {{ t('footer.legal.terms') }}
            </BaseLink>
          </nav>
        </div>

        <!-- Preferences -->
        <div class="flex flex-col gap-5">
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
      </div>

      <div
        class="border-t border-surface-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <p class="text-xs text-on-ghost-muted m-0">
          &copy; {{ new Date().getFullYear() }} schul-dashboard. {{ t('footer.rights') }}
        </p>
        <a
          href="https://stats.uptimerobot.com/m8tUrWG3Zz"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-xs text-on-ghost-muted no-underline hover:text-on-ghost transition-colors"
        >
          {{ t('footer.status') }}
          <ExternalLink :size="12" aria-hidden="true" />
        </a>
      </div>
    </div>
  </footer>
</template>
