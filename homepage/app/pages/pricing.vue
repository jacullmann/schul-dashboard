<script setup lang="ts">
const { t } = useI18n();

// SEO
useSeoMetaWithI18n({
  title: () => `${t('pages.pricing.title')} — schul-dashboard`,
  description: () => t('pages.pricing.description'),
  keywords: 'pricing, plans, billing',
  canonicalUrl: 'https://schul-dashboard.com/pricing',
});
</script>

<template>
  <div class="w-full">
    <section class="w-full py-20 md:py-12">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 text-center">
        <h1 class="text-[clamp(2rem,5vw,3.5rem)] font-bold font-display text-on-surface leading-[1.2] mb-4">
          {{ t('pages.pricing.title') }}
        </h1>
        <p class="text-lg text-on-surface-muted max-w-xl mx-auto">
          {{ t('pages.pricing.description') }}
        </p>
      </div>
    </section>

    <!-- Pricing section with full plans -->
    <PricingSection />
  </div>
</template>
