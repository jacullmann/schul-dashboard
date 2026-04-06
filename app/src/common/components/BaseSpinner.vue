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
  if (props.on === 'ghost') return 'var(--color-on-surface-muted)';
  return 'var(--color-on-surface)';
});

const sizeNum = computed(() => parseInt(props.size || '16'));
const strokeNum = computed(() => parseInt(props.borderThickness || '2'));
const radius = computed(() => (sizeNum.value - strokeNum.value * 2) / 2);
const center = computed(() => sizeNum.value / 2);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${sizeNum} ${sizeNum}`"
    class="inline-block animate-[spinner-rotate_2.2s_linear_infinite]"
    style="transform-origin: center center"
    role="status"
    aria-live="polite"
    aria-label="Loading..."
  >
    <circle
      :cx="center"
      :cy="center"
      :r="radius"
      :stroke="activeColor"
      :stroke-width="borderThickness"
      class="fill-none animate-[spinner-element_1.6s_ease-in-out_infinite]"
      style="
        stroke-linecap: round;
        stroke-miterlimit: 10;
        stroke-dasharray: 1, 200;
        stroke-dashoffset: 0;
      "
    />
  </svg>
</template>

<style>
@keyframes spinner-rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes spinner-element {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 89, 200;
    stroke-dashoffset: -35px;
  }
  100% {
    stroke-dasharray: 89, 200;
    stroke-dashoffset: -124px;
  }
}
</style>
