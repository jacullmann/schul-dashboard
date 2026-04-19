<script setup lang="ts">
withDefaults(
  defineProps<{
    flat?: boolean;
    on?: 'canvas' | 'surface' | 'action';
  }>(),
  {
    flat: false,
    on: 'surface',
  },
);
</script>

<template>
  <kbd
    class="inline-flex items-center font-mono text-[0.75rem] leading-[0.875rem] select-none cursor-default"
    :class="[
      !flat
        ? 'bg-kbd-bg text-kbd-text border border-kbd-border rounded-md shadow-[0_2px_0_var(--color-kbd-border-bottom),0_3px_2px_var(--color-kbd-shadow)] transition-[transform,box-shadow] duration-100 ease active:translate-y-[2px] active:shadow-[0_0_0_var(--color-kbd-border-bottom),0_1px_2px_var(--color-kbd-shadow)]'
        : 'px-[6px] rounded-sm',
      flat && on === 'canvas' ? 'bg-canvas-hover text-on-canvas-muted' : '',
      flat && on === 'surface' ? 'bg-surface-hover text-on-surface-muted' : '',
      flat && on === 'action' ? 'bg-action-hover text-on-action-muted' : '',
    ]"
  >
    <slot></slot>
  </kbd>
</template>
