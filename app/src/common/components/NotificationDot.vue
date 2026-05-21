<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number;
  }>(),
  { size: 2 },
);
</script>

<template>
  <span
    class="inline-block rounded-full bg-danger shrink-0"
    :style="{
      width: 'calc(var(--custom-size) * var(--spacing))',
      height: 'calc(var(--custom-size) * var(--spacing))',
      '--custom-size': size,
    }"
  />
</template>
