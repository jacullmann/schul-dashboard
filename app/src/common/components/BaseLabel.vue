<script setup lang="ts">
const props = defineProps<{
  for: string;
  required?: boolean;
}>();
</script>

<template>
  <label class="block text-on-surface-muted text-btn mb-1.5" :for="props.for">
    <slot />

    <span v-if="props.required" class="text-danger ml-1" aria-hidden="true">*</span>
  </label>
</template>
