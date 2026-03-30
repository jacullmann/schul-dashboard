<script setup lang="ts">
const props = defineProps<{
  for: string;
  required?: boolean;
}>();
</script>

<template>
  <label class="block text-on-surface-muted text-btn mb-[6px]" :for="props.for">
    <slot />
    <span v-if="required" class="text-danger ml-1" aria-hidden="true"> * </span>
  </label>
</template>
