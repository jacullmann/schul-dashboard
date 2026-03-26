<script setup lang="ts">
defineProps<{
  to: string;
}>();
</script>

<template>
  <router-link
    :to="to"
    class="block !text-on-surface-muted no-underline text-body transition-colors duration-200 font-medium hover:text-on-surface"
  >
    <slot />
  </router-link>
</template>
