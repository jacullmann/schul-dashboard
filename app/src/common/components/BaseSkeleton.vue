<script setup lang="ts">
withDefaults(defineProps<{
  radius?: 'full' | 'md' | 'lg' | 'xl';
  width?: string;
  height?: string;
}>(), {
  radius: 'full',
  width: 'full',
  height: '6',
});
</script>

<template>
  <div
    class="bg-canvas-hover animate-pulse"
    :class="[
      'rounded-' + radius,
      'w-' + width,
      'h-' + height,
    ]"
  ></div>
</template>
