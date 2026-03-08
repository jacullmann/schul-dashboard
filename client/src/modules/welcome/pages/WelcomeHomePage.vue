<template>
  <WelcomeContent :on-more-info-click="scrollToSection" />
  <WelcomeSection ref="welcomeSectionRef" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import WelcomeContent from '@/modules/welcome/components/WelcomeContent.vue';
import WelcomeSection from '@/modules/welcome/components/WelcomeSection.vue';

const welcomeSectionRef = ref<InstanceType<typeof WelcomeSection> | null>(null);

function scrollToSection() {
  const targetElement = welcomeSectionRef.value?.$el;

  if (targetElement) {
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}
</script>