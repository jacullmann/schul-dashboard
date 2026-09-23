<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="page page-grid gap-y-10 pt-intro pb-section">
    <div class="col-span-12 flex flex-col gap-6 lg:col-span-9 lg:col-start-4">
      <h1 class="font-serif text-headline">{{ title }}</h1>
      <p v-if="description" class="max-w-prose text-lede text-on-ghost-muted">{{ description }}</p>
    </div>

    <div class="col-span-12 mt-8 border-t border-on-ghost lg:col-span-9 lg:col-start-4">
      <slot />
    </div>
  </div>
</template>
