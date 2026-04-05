<script setup lang="ts">
const { t } = useI18n();

// SEO
useSeoMetaWithI18n({
  title: () => t('pages.home.title'),
  description: () => t('pages.home.description'),
  keywords: 'school management, dashboard, students',
  canonicalUrl: 'https://schul-dashboard.com',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'schul-dashboard',
    description: t('pages.home.description'),
    url: 'https://schul-dashboard.com',
    applicationCategory: 'EducationalApplication',
  },
});
</script>

<template>
  <div class="w-full">
    <HeroSection />
    <FeaturesSection />
    <PricingSection />
    <CTASection />
  </div>
</template>

