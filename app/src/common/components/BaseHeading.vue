<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  level: {
    type: [String, Number],
    default: 1,
    validator: (value) => [1, 2, 3, 4, 5, 6].includes(Number(value)),
  },
});

const tag = computed(() => {
  `h${props.level}`;
});

const classes = computed(() => {
  return {
    1: 'text-h1 tracking-[-0.03em]',
    2: 'text-h2 tracking-[-0.02em]',
    3: 'text-h3 tracking-[-0.01em]',
    4: 'text-title tracking-normal',
    5: 'text-body tracking-[0.02em]',
    6: 'text-sub tracking-[0.05em] uppercase',
  }[props.level];
});
</script>

<template>
  <component
    :is="tag"
    class="text-on-surface font-display font-bold text-left"
    :class="classes"
  >
    <slot></slot>
  </component>
</template>