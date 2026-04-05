<script setup lang="ts">
const { t } = useI18n();

// SEO
useSeoMetaWithI18n({
  title: () => `${t('pages.features.title')} — schul-dashboard`,
  description: () => t('pages.features.description'),
  keywords: 'features, capabilities, functionality',
  canonicalUrl: 'https://schul-dashboard.com/features',
});
</script>

<template>
  <div class="w-full">
    <section class="w-full py-20 md:py-12">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
        <h1 class="text-[clamp(2rem,5vw,3.5rem)] font-bold font-display text-on-surface leading-[1.2] mb-4 text-center max-w-2xl mx-auto">
          {{ t('pages.features.title') }}
        </h1>
        <p class="text-lg text-on-surface-muted text-center max-w-xl mx-auto">
          {{ t('pages.features.description') }}
        </p>
      </div>
    </section>

    <!-- TODO: Add feature details sections -->
    <section class="w-full py-16 md:py-12">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
        <div class="grid grid-cols-2 md:grid-cols-1 gap-8">
          <div
            v-for="idx in 6"
            :key="`feature-detail-${idx}`"
            class="bg-surface border border-surface-border rounded-xl p-8"
          >
            <div class="text-3xl mb-3">📌</div>
            <h3 class="text-title font-semibold text-on-surface font-display mb-2">
              {{ t(`pages.features.detail${idx}.title`) }}
            </h3>
            <p class="text-on-surface-muted">
              {{ t(`pages.features.detail${idx}.description`) }}
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
