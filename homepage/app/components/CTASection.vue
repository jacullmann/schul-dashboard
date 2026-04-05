<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';

const { t } = useI18n();
const config = useRuntimeConfig();
</script>

<template>
  <section class="w-full py-24 md:py-16">
    <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
      <div class="rounded-2xl border border-surface-border px-8 py-16 md:py-12 text-center">
        <h2 class="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-on-surface font-display leading-[1.2] mb-4 max-w-2xl mx-auto">
          {{ t('sections.cta.title') }}
        </h2>
        <p class="text-lg text-on-surface-muted mb-8 leading-[1.6]">
          {{ t('sections.cta.description') }}
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            :href="config.public.appUrl || 'https://app.schul-dashboard.com'"
            class="px-8 py-3.5 rounded-lg bg-action text-on-action font-semibold transition-all hover:bg-action-hover inline-flex items-center justify-center gap-2 group"
          >
            {{ t('sections.cta.primary_cta') }}
            <ArrowRight :size="16" class="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </a>
          <a
            href="mailto:contact@schul-dashboard.com"
            class="px-8 py-3.5 rounded-lg border border-surface-border text-on-surface font-semibold transition-all hover:border-surface-hover-border hover:bg-surface-hover-subtle inline-flex items-center justify-center"
          >
            {{ t('sections.cta.secondary_cta') }}
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
