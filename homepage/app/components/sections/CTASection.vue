<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

/**
 * TODO: CTA Section
 * - Customize headline and copy
 * - Update button links
 * - Consider adding sub-text or guarantees
 */
</script>

<template>
  <section class="w-full py-16 md:py-12 bg-surface border-t border-surface-border">
    <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 text-center">
      <h2 class="text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-on-surface font-display leading-[1.2] mb-4 max-w-2xl mx-auto">
        {{ t('sections.cta.title') }}
      </h2>

      <p class="text-lg text-on-surface-muted mb-8 max-w-xl mx-auto">
        {{ t('sections.cta.description') }}
      </p>

      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <NuxtLink
          :to="localePath('index')"
          class="px-8 py-3.5 rounded-lg bg-action text-on-action font-semibold transition-all hover:bg-action-hover inline-flex items-center justify-center"
        >
          {{ t('sections.cta.primary_cta') }}
        </NuxtLink>
        <NuxtLink
          :to="localePath('pricing')"
          class="px-8 py-3.5 rounded-lg border border-surface-border text-on-surface font-semibold transition-all hover:border-surface-hover-border hover:bg-surface-hover-subtle inline-flex items-center justify-center"
        >
          {{ t('sections.cta.secondary_cta') }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

