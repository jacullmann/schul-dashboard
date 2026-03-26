<script setup lang="ts">
defineProps<{
  for: string;
  required?: boolean;
}>();
</script>

<template>
  <label
      class="block text-on-surface-muted font-btn mb-[6px]"
      :for="for"
  >
    <slot />

    <span
        v-if="required"
        class="text-danger ml-1"
        aria-hidden="true"
    >
      *
    </span>
  </label>
</template>
