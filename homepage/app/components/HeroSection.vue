<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';

const { t } = useI18n();
const config = useRuntimeConfig();
</script>

<template>
  <section class="relative w-full min-h-[calc(100vh_-_56px)] flex items-center overflow-hidden">
    <div
      class="absolute bottom-0 left-0 w-[400px] h-[400px]"
    />
    <div class="relative z-10 max-w-[1300px] w-full mx-auto px-4 lg:px-6 py-20 md:py-16">
      <div class="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        <div class="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl mx-auto lg:mx-0">
          <h1 class="text-[clamp(2.25rem,5vw,3.75rem)] font-bold font-display text-on-surface leading-[1.15] mb-5">
            {{ t('sections.hero.title') }}
          </h1>

          <p class="text-lg text-on-surface-muted leading-[1.65] mb-8 max-w-md">
            {{ t('sections.hero.description') }}
          </p>

          <div class="flex flex-col sm:flex-row gap-3">
            <a
              :href="config.public.appUrl || 'https://app.schul-dashboard.com'"
              class="px-3 py-1.5 rounded-lg bg-action text-white font-medium inline-flex items-center justify-center gap-2 group"
            >
              {{ t('sections.hero.cta_primary') }}
            </a>
            <a
              :href="config.public.appUrl || 'https://app.schul-dashboard.com'"
              class="px-3 py-1.5 rounded-lg border border-surface-border text-on-surface font-medium inline-flex items-center justify-center"
            >
              {{ t('sections.hero.cta_secondary') }}
            </a>
          </div>

          <p class="text-footnote text-on-surface-subtle mt-6">
            {{ t('sections.hero.social_proof') }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
