<script setup lang="ts">
const { t } = useI18n();

useSeoMetaWithI18n({
  title: () => t('pages.home.title'),
  description: () => t('pages.home.description'),
  keywords: 'school management, dashboard, students, free, homework, schedule',
  canonicalUrl: 'https://schul-dashboard.com',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'schul-dashboard',
    description: t('pages.home.description'),
    url: 'https://schul-dashboard.com',
    applicationCategory: 'EducationalApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  },
});
</script>

<template>
  <div class="w-full">
    <HeroSection />
    <FeaturesSection />
    <ProductSection />
    <CTASection />
  </div>
</template>
