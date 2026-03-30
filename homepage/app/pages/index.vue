<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

useSeoMeta({
  title: () => 'schul-dashboard – ' + t('hero.sublineHighlight'),
  description: () => t('hero.subline') + ' ' + t('hero.sublineHighlight'),
  ogTitle: 'schul-dashboard',
  ogDescription: () => t('hero.subline') + ' ' + t('hero.sublineHighlight'),
});

function scrollToSection() {
  document.getElementById('welcome-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <WelcomeContent :on-more-info-click="scrollToSection" />
  <WelcomeSection />
</template>
