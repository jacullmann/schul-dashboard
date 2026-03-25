<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  on?: 'action' | 'ghost' | 'danger' | 'default';
  color?: string;
  size?: string;
  borderThickness?: string;
}>(), {
  on: 'ghost',
  size: '16px',
  borderThickness: '2px',
});

const activeColor = computed(() => {
  if (props.color) return props.color;
  if (props.on === 'action') return 'var(--color-on-action)';
  if (props.on === 'danger') return 'var(--color-on-danger)';
  return 'var(--color-on-surface)';
});
</script>

<template>
  <span
      class="inline-block rounded-full border-solid animate-spin"
      :style="{
        width: size,
        height: size,
        borderWidth: borderThickness,
        borderColor: activeColor,
        animationDuration: '0.8s'
      }"
      role="status"
      aria-label="Loading..."
  ></span>
</template>
