<script setup lang="ts">
import WelcomeContent from '@/modules/welcome/components/WelcomeContent.vue';
import WelcomeSection from '@/modules/welcome/components/WelcomeSection.vue';

function scrollToSection() {
  document.getElementById('welcome-section')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
</script>

<template>
  <WelcomeContent :on-more-info-click="scrollToSection" />
  <WelcomeSection />
</template>
