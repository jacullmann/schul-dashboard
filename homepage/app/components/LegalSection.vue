<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <section class="py-8 first:pt-0">
    <h2 class="text-h3 font-semibold font-display text-on-surface mb-3">{{ title }}</h2>
    <slot />
  </section>
</template>
