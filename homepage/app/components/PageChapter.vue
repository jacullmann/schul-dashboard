<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<template>
  <section class="page pt-section">
    <div class="page-grid gap-y-10 border-t border-on-ghost pt-5 lg:gap-y-14">
      <p class="col-span-12 text-label font-medium lg:col-span-3">{{ label }}</p>
      <slot />
    </div>
  </section>
</template>
