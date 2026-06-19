<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';

const { t } = useI18n();
const config = useRuntimeConfig();
</script>

<template>
  <section class="w-full py-24 md:py-16">
    <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
      <div class="rounded-2xl border border-ghost-border px-8 py-16 md:py-12 text-center">
        <h2
          class="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-on-ghost font-display leading-[1.2] mb-4 max-w-2xl mx-auto"
        >
          {{ t('sections.cta.title') }}
        </h2>
        <p class="text-lg text-on-ghost-muted mb-8 leading-[1.6]">
          {{ t('sections.cta.description') }}
        </p>
        <BaseRow justify="center" class="flex flex-col sm:flex-row">
          <BaseButton
            variant="action"
            :icon="ArrowRight"
            icon-placement="trailing"
            :href="config.public.appUrl || 'https://app.schul-dashboard.com'"
            target="_self"
          >
            {{ t('sections.cta.primary_cta') }}
          </BaseButton>
          <BaseButton
            variant="ghost"
            href="mailto:contact@schul-dashboard.com"
          >
            {{ t('sections.cta.secondary_cta') }}
          </BaseButton>
        </BaseRow>
      </div>
    </div>
  </section>
</template>
