<script setup lang="ts">
withDefaults(
  defineProps<{
    blurSize?: 'sm' | 'md' | 'lg';
    opacity?: 'light' | 'heavy';
    /** Frost washes the page out in the canvas colour, so content can sit right on it. */
    tint?: 'shade' | 'frost';
  }>(),
  {
    blurSize: 'md',
    opacity: 'heavy',
    tint: 'shade',
  },
);

const emit = defineEmits<{ (e: 'cancel'): void }>();

const blurClass = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
};

const tintClass = {
  shade: { light: 'bg-black/25', heavy: 'bg-black/40' },
  frost: { light: 'bg-canvas/40', heavy: 'bg-canvas/60' },
};
</script>

<template>
  <div
    class="fixed inset-0 z-(--z-modal-overlay) flex items-center justify-center"
    :class="[blurClass[blurSize], tintClass[tint][opacity]]"
    @click.self="emit('cancel')"
  >
    <slot></slot>
  </div>
</template>
