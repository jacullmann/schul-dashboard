<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    on?: 'action' | 'ghost' | 'input' | 'danger';
    color?: string;
    size?: string;
    borderThickness?: string;
  }>(),
  {
    on: 'ghost',
    size: '16px',
    borderThickness: '2px',
  },
);

const activeColor = computed(() => {
  if (props.color) return props.color;
  if (props.on === 'action') return 'var(--color-on-action)';
  if (props.on === 'danger') return 'var(--color-on-danger)';
  if (props.on === 'ghost') return 'var(--color-on-ghost-muted)';
  return 'var(--color-on-ghost)';
});

const sizeNum = computed(() => parseFloat(props.size || '16'));
const strokeNum = computed(() => parseFloat(props.borderThickness || '2'));
const radius = computed(() =>
  Math.max(1, (sizeNum.value - strokeNum.value) / 2),
);
const center = computed(() => sizeNum.value / 2);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${sizeNum} ${sizeNum}`"
    class="premium-spinner"
    role="status"
    aria-live="polite"
    aria-label="Loading..."
  >
    <!-- Subtle background track for depth -->
    <circle
      :cx="center"
      :cy="center"
      :r="radius"
      :stroke="activeColor"
      :stroke-width="borderThickness"
      stroke-opacity="0"
      class="fill-none transition-colors duration-300"
    />
    <!-- Animated fluid foreground track -->
    <circle
      :cx="center"
      :cy="center"
      :r="radius"
      :stroke="activeColor"
      :stroke-width="borderThickness"
      pathLength="100"
      class="fill-none spinner-fg transition-colors duration-300"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.premium-spinner {
  display: inline-block;
  animation: spinner-rotate 2.2s linear infinite;
  transform-origin: center center;
  will-change: transform;
}

.spinner-fg {
  /* Ultra-smooth cubic bezier for liquid-like scaling */
  animation: spinner-dash 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: stroke-dasharray, stroke-dashoffset;
}

@keyframes spinner-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes spinner-dash {
  0% {
    stroke-dasharray: 1, 100;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 85, 100;
    stroke-dashoffset: -5;
  }
  100% {
    stroke-dasharray: 1, 100;
    stroke-dashoffset: -100;
  }
}
</style>
