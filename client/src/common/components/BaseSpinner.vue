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
      class="inline-block rounded-full border-solid border-current border-t-transparent animate-spin [animation-duration:750ms] motion-reduce:animate-[spin_3s_linear_infinite]"
      :style="{
        width: size,
        height: size,
        borderWidth: borderThickness,
        color: activeColor,
      }"
      role="status"
      aria-live="polite"
      aria-label="Loading..."
  ></span>
</template>
