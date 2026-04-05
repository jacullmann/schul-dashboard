<script setup lang="ts">
import { Heart, Code2, Shield, Zap } from '@lucide/vue';

const { t } = useI18n();

useSeoMetaWithI18n({
  title: () => `${t('pages.about.title')} — schul-dashboard`,
  description: () => t('pages.about.description'),
  keywords: 'about, mission, student project, open source, school management',
  canonicalUrl: 'https://schul-dashboard.com/about',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About schul-dashboard',
    description: t('pages.about.description'),
  },
});

const values = [
  { icon: Heart, key: 'free' },
  { icon: Shield, key: 'privacy' },
  { icon: Code2, key: 'open' },
  { icon: Zap, key: 'simple' },
];
</script>

<template>
  <div class="w-full">

    <section class="w-full py-20 md:py-14 border-b border-surface-border">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 text-center">
        <h1 class="text-[clamp(2rem,5vw,3.5rem)] font-bold font-display text-on-surface leading-[1.15] mb-5 max-w-2xl mx-auto">
          {{ t('pages.about.title') }}
        </h1>
        <p class="text-lg text-on-surface-muted leading-[1.65]">
          {{ t('pages.about.description') }}
        </p>
      </div>
    </section>

    <section class="w-full py-20 md:py-14 border-b border-surface-border">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-[clamp(1.5rem,3vw,2.25rem)] font-bold font-display text-on-surface leading-[1.2] mb-5">
            {{ t('pages.about.mission_title') }}
          </h2>
          <p class="text-on-surface-muted leading-[1.75] text-lg">
            {{ t('pages.about.mission_text') }}
          </p>
        </div>
      </div>
    </section>

    <section class="w-full py-20 md:py-14 border-b border-surface-border">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
        <h2 class="text-[clamp(1.5rem,3vw,2.25rem)] font-bold font-display text-on-surface leading-[1.2] mb-12 text-center">
          {{ t('pages.about.values_title') }}
        </h2>
        <div class="grid grid-cols-4 md:grid-cols-2 sm:grid-cols-1 gap-6">
          <div
              v-for="value in values"
              :key="value.key"
              class="bg-surface border border-surface-border rounded-xl p-6 flex flex-col gap-4"
          >
            <div class="w-10 h-10 rounded-lg bg-canvas border border-surface-border flex items-center justify-center text-on-surface-muted flex-shrink-0">
              <component :is="value.icon" :size="20" aria-hidden="true" />
            </div>
            <div>
              <h3 class="font-semibold text-on-surface font-display mb-2">
                {{ t(`pages.about.value_${value.key}_title`) }}
              </h3>
              <p class="text-sub text-on-surface-muted leading-[1.65] m-0">
                {{ t(`pages.about.value_${value.key}_text`) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="w-full py-20 md:py-14">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 text-center">
        <h2 class="text-[clamp(1.5rem,3vw,2.25rem)] font-bold font-display text-on-surface leading-[1.2] mb-5">
          {{ t('pages.about.team_title') }}
        </h2>
        <p class="text-on-surface-muted leading-[1.65] mb-0">
          {{ t('pages.about.team_text') }}
        </p>
      </div>
    </section>

    <CTASection />
  </div>
</template>
