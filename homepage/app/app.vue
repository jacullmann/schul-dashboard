<script setup lang="ts">
import { onMounted } from 'vue';
import { initializeTheme } from '~/composables/useTheme';

onMounted(() => {
  initializeTheme();
});
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
