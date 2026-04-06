<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    radius?: 'full' | 'md' | 'lg' | 'xl';
    width?: string;
    height?: string;
  }>(),
  {
    radius: 'full',
    width: 'full',
    height: '6',
  },
);

const skeletonStyle = computed(() => {
  const parseSize = (val: string) => {
    if (val === 'full') return '100%';
    if (/^\d+$/.test(val)) return `${Number(val) * 4}px`;
    if (val.startsWith('[') && val.endsWith(']')) return val.slice(1, -1);
    return val;
  };

  return {
    width: parseSize(props.width),
    height: parseSize(props.height),
    borderRadius: `var(--radius-${props.radius})`,
  };
});
</script>

<template>
  <div class="bg-canvas-hover animate-pulse" :style="skeletonStyle"></div>
</template>
