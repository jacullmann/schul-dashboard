<script setup lang="ts">
withDefaults(
  defineProps<{
    blurSize?: 'sm' | 'md' | 'lg';
    opacity?: 'light' | 'heavy';
  }>(),
  {
    blurSize: 'md',
    opacity: 'heavy',
  },
);

const emit = defineEmits<{ (e: 'cancel'): void }>();

const blurClass = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
};

const opacityClass = {
  light: 'bg-black/25',
  heavy: 'bg-black/40',
};
</script>

<template>
  <div
    class="fixed inset-0 z-9999 flex items-center justify-center"
    :class="[blurClass[blurSize], opacityClass[opacity]]"
    @click.self="emit('cancel')"
    aria-hidden="true"
  >
    <slot></slot>
  </div>
</template>
