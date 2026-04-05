<script setup lang="ts">
withDefaults(defineProps<{
  flat?: boolean;
  on?: 'canvas' | 'surface' | 'action';
}>(), {
  flat: false,
  on: 'surface'
}) 
</script>

<template>
  <kbd :class="[flat ? 'flat' : 'full', on]">
    <slot></slot>
  </kbd>
</template>

<style scoped>
kbd.full {
  display: inline-flex;
  align-items: center;
  background-color: var(--color-kbd-bg);
  color: var(--color-kbd-text);
  border: 1px solid var(--color-kbd-border);
  box-shadow: 0 2px 0 var(--color-kbd-border-bottom), 0 3px 2px var(--color-kbd-shadow);
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.75rem;
  line-height: 0.875rem;
  padding: 2px 6px;
  user-select: none;
  -webkit-user-select: none;
  cursor: default;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

kbd.full:active {
  transform: translateY(2px);
  box-shadow: 0 0 0 var(--color-kbd-border-bottom), 0 1px 2px var(--color-kbd-shadow);
}

kbd.flat {
  display: inline-flex;
  align-items: center;
  font-family: monospace;
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0 6px;
  border-radius: var(--radius-sm);
  user-select: none;
  -webkit-user-select: none;
  cursor: default;
}

kbd.flat.canvas {
  background-color: var(--color-canvas-hover);
  color: var(--color-on-canvas-muted);
}

kbd.flat.surface {
  background-color: var(--color-surface-hover);
  color: var(--color-on-surface-muted);
}

kbd.flat.action {
  background-color: var(--color-action-hover);
  color: var(--color-on-action-muted);
}
</style>