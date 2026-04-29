<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <section class="py-8 first:pt-0">
    <h2 class="text-xl font-semibold font-display text-on-ghost mb-3">{{ title }}</h2>
    <slot />
  </section>
</template>

