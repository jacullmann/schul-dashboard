<script setup lang="ts">
const { t } = useI18n();

// SEO
useSeoMetaWithI18n({
  title: () => `${t('pages.about.title')} — schul-dashboard`,
  description: () => t('pages.about.description'),
  keywords: 'about, mission, team, values',
  canonicalUrl: 'https://schul-dashboard.com/about',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About schul-dashboard',
    description: t('pages.about.description'),
  },
});
</script>

<template>
  <div class="w-full">
    <!-- Hero -->
    <section class="w-full py-20 md:py-12">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6 text-center">
        <h1 class="text-[clamp(2rem,5vw,3.5rem)] font-bold font-display text-on-surface leading-[1.2] mb-4">
          {{ t('pages.about.title') }}
        </h1>
        <p class="text-lg text-on-surface-muted max-w-xl mx-auto">
          {{ t('pages.about.description') }}
        </p>
      </div>
    </section>

    <!-- Mission Section -->
    <section class="w-full py-16 md:py-12 border-t border-surface-border">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
        <div class="grid grid-cols-2 md:grid-cols-1 gap-12">
          <!-- Left: Copy -->
          <div class="flex flex-col gap-6">
            <h2 class="text-2xl font-bold font-display text-on-surface">
              {{ t('pages.about.mission_title') }}
            </h2>
            <p class="text-on-surface-muted leading-[1.6]">
              {{ t('pages.about.mission_text') }}
            </p>
          </div>

          <!-- Right: Values Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div v-for="idx in 4" :key="`value-${idx}`" class="bg-surface border border-surface-border rounded-xl p-6">
              <div class="text-3xl mb-3">💡</div>
              <h3 class="font-semibold text-on-surface font-display mb-2">
                {{ t(`pages.about.value${idx}_title`) }}
              </h3>
              <p class="text-sm text-on-surface-muted">
                {{ t(`pages.about.value${idx}_text`) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Team Section -->
    <section class="w-full py-16 md:py-12 bg-surface border-t border-surface-border">
      <div class="max-w-[1300px] w-full mx-auto px-4 lg:px-6">
        <h2 class="text-2xl font-bold font-display text-on-surface mb-12 text-center">
          {{ t('pages.about.team_title') }}
        </h2>

        <div class="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-6">
          <div
            v-for="idx in 3"
            :key="`team-${idx}`"
            class="text-center"
          >
            <div class="w-24 h-24 rounded-full bg-canvas border border-canvas-border mx-auto mb-4 flex items-center justify-center">
              👤
            </div>
            <h3 class="font-semibold text-on-surface font-display mb-1">
              {{ t(`pages.about.team${idx}_name`) }}
            </h3>
            <p class="text-sm text-on-surface-muted">
              {{ t(`pages.about.team${idx}_role`) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <CTASection />
  </div>
</template>
