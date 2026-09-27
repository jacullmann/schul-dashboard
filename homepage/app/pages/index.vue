<script setup lang="ts">
const { t } = useI18n();

useSeoMetaWithI18n({
  title: () => t('pages.home.title'),
  description: () => t('pages.home.description'),
  keywords: 'school management, dashboard, students, free, homework, schedule',
});
</script>

<template>
  <HomeHero />
  <HomeTasks />
  <HomeChanges />
  <HomeGroups />
  <HomeExtras />
  <HomePrinciples />
  <CallToAction />
</template>
