<script setup lang="ts">
import { computed } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { useTheme } from '~/composables/useTheme';

const { selectedThemeMode } = useTheme();
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

const themeClass = computed(() => {
  const mode = selectedThemeMode.value;
  if (mode === 'dark') return '';
  if (mode === 'light') return 'light';
  return import.meta.server ? '' : (prefersDark.value ? '' : 'light');
});

useHead(
  computed(() => ({
    htmlAttrs: { class: themeClass.value },
  })),
);
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
