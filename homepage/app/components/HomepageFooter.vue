<script setup lang="ts">
import { ExternalLink } from '@lucide/vue';

const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <footer class="w-full bg-canvas border-t border-surface-border">
    <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 py-14 md:py-10">
      <div class="grid grid-cols-4 md:grid-cols-2 sm:grid-cols-1 gap-10 mb-12">
        <!-- Brand -->
        <div class="flex flex-col gap-3">
          <NuxtLink
            :to="localePath('index')"
            class="inline-flex items-center gap-2 no-underline w-fit group"
            aria-label="schul-dashboard home"
          >
            <img src="/favicon.svg" alt="" class="w-7 h-7" />
            <span
              class="font-bold text-on-ghost font-display text-sub group-hover:opacity-80 transition-opacity"
            >
              schul-dashboard
            </span>
          </NuxtLink>
          <p class="text-footnote text-on-ghost-muted leading-[1.6] max-w-[200px] m-0">
            {{ t('footer.tagline') }}
          </p>
        </div>

        <!-- Navigation -->
        <div class="flex flex-col gap-3">
          <p class="text-btn font-semibold text-on-ghost m-0">
            {{ t('footer.navigation.title') }}
          </p>
          <nav class="flex flex-col gap-2" aria-label="Footer navigation">
            <NuxtLink
              :to="localePath('index')"
              class="text-footnote text-on-ghost-muted no-underline transition-colors hover:text-on-ghost"
            >
              {{ t('footer.navigation.home') }}
            </NuxtLink>
            <NuxtLink
              :to="localePath('features')"
              class="text-footnote text-on-ghost-muted no-underline transition-colors hover:text-on-ghost"
            >
              {{ t('footer.navigation.features') }}
            </NuxtLink>
            <NuxtLink
              :to="localePath('product')"
              class="text-footnote text-on-ghost-muted no-underline transition-colors hover:text-on-ghost"
            >
              {{ t('footer.navigation.product') }}
            </NuxtLink>
            <NuxtLink
              :to="localePath('about')"
              class="text-footnote text-on-ghost-muted no-underline transition-colors hover:text-on-ghost"
            >
              {{ t('footer.navigation.about') }}
            </NuxtLink>
            <NuxtLink
              :to="localePath('contact')"
              class="text-footnote text-on-ghost-muted no-underline transition-colors hover:text-on-ghost"
            >
              {{ t('footer.navigation.contact') }}
            </NuxtLink>
          </nav>
        </div>

        <!-- Legal -->
        <div class="flex flex-col gap-3">
          <p class="text-btn font-semibold text-on-ghost m-0">{{ t('footer.legal.title') }}</p>
          <nav class="flex flex-col gap-2" aria-label="Legal navigation">
            <NuxtLink
              :to="localePath('legal-imprint')"
              class="text-footnote text-on-ghost-muted no-underline transition-colors hover:text-on-ghost"
            >
              {{ t('footer.legal.imprint') }}
            </NuxtLink>
            <NuxtLink
              :to="localePath('legal-privacy-policy')"
              class="text-footnote text-on-ghost-muted no-underline transition-colors hover:text-on-ghost"
            >
              {{ t('footer.legal.privacy') }}
            </NuxtLink>
            <NuxtLink
              :to="localePath('legal-terms')"
              class="text-footnote text-on-ghost-muted no-underline transition-colors hover:text-on-ghost"
            >
              {{ t('footer.legal.terms') }}
            </NuxtLink>
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
        <p class="text-footnote text-on-ghost-muted m-0">
          &copy; {{ new Date().getFullYear() }} schul-dashboard. {{ t('footer.rights') }}
        </p>
        <a
          href="https://stats.uptimerobot.com/m8tUrWG3Zz"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-footnote text-on-ghost-muted no-underline hover:text-on-ghost transition-colors"
        >
          {{ t('footer.status') }}
          <ExternalLink :size="12" aria-hidden="true" />
        </a>
      </div>
    </div>
  </footer>
</template>

