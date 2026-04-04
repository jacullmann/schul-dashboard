<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({
  title: () => 'schul-dashboard – ' + t('hero.sublineHighlight'),
  description: () => t('hero.subline') + ' ' + t('hero.sublineHighlight'),
  ogTitle: 'schul-dashboard',
  ogDescription: () => t('hero.subline') + ' ' + t('hero.sublineHighlight'),
});

function scrollToFeatures() {
  document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <HeroSection :on-more-info-click="scrollToFeatures" />
  <StatsSection />
  <FeaturesSection id="features-section" />
  <SocialProofSection />
  <CTASection />
</template>
