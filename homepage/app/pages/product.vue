<script setup lang="ts">
import { CheckCircle, ArrowRight } from '@lucide/vue';

const { t } = useI18n();
const config = useRuntimeConfig();

useSeoMetaWithI18n({
  title: () => `${t('pages.product.title')} — schul-dashboard`,
  description: () => t('pages.product.description'),
  keywords: 'free school app, school management, students, no ads, privacy',
  canonicalUrl: 'https://schul-dashboard.com/product',
});

const allFeatures = [
  'pages.product.feature0',
  'pages.product.feature1',
  'pages.product.feature2',
  'pages.product.feature3',
  'pages.product.feature4',
  'pages.product.feature5',
  'pages.product.feature6',
  'pages.product.feature7',
];
</script>

<template>
  <div class="w-full">
    <section class="w-full py-20 md:py-14 border-b border-surface-border">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 text-center">
        <div
          class="inline-block px-3.5 py-1 rounded-full bg-surface border border-surface-border text-footnote font-semibold text-on-ghost-muted uppercase tracking-wider mb-5"
        >
          {{ t('pages.product.badge') }}
        </div>
        <h1
          class="text-[clamp(2rem,5vw,3.5rem)] font-bold font-display text-on-ghost leading-[1.15] mb-5 max-w-2xl mx-auto"
        >
          {{ t('pages.product.title') }}
        </h1>
        <p class="text-lg text-on-ghost-muted leading-[1.65] mb-8">
          {{ t('pages.product.description') }}
        </p>
        <a
          :href="config.public.appUrl || 'https://app.schul-dashboard.com'"
          class="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-action text-on-action font-semibold transition-all hover:bg-action-hover group"
        >
          {{ t('pages.product.cta') }}
        </a>
      </div>
    </section>

    <section class="w-full py-20 md:py-14">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
        <div class="max-w-2xl mx-auto text-center mb-14">
          <h2
            class="text-[clamp(1.5rem,3vw,2.25rem)] font-bold font-display text-on-ghost leading-[1.2] mb-4"
          >
            {{ t('pages.product.included_title') }}
          </h2>
          <p class="text-on-ghost-muted leading-[1.65]">
            {{ t('pages.product.included_description') }}
          </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-1 gap-4 max-w-3xl mx-auto">
          <div
            v-for="key in allFeatures"
            :key="key"
            class="flex items-start gap-3 p-5 rounded-xl bg-surface border border-surface-border"
          >
            •
            <span class="text-on-ghost-muted text-sm leading-[1.6]">{{ t(key) }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="w-full py-14 md:py-10 bg-surface border-y border-surface-border">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 text-center">
        <p class="text-footnote font-semibold text-on-ghost-muted uppercase tracking-wider mb-2">
          {{ t('pages.product.price_label') }}
        </p>
        <div
          class="text-[clamp(4rem,10vw,7rem)] font-bold font-display text-on-ghost leading-none mb-3"
        >
          {{ t('pages.product.price') }}
        </div>
        <p class="text-on-ghost-muted leading-[1.6]">
          {{ t('pages.product.price_description') }}
        </p>
      </div>
    </section>

    <CTASection />
  </div>
</template>

