<script setup lang="ts">
withDefaults(
  defineProps<{
    flat?: boolean;
    on?: 'ghost' | 'action';
  }>(),
  {
    flat: false,
    on: 'ghost',
  },
);
</script>

<template>
  <kbd :class="[flat ? 'flat' : 'default', on]">
    <slot></slot>
  </kbd>
</template>

<style scoped>
kbd.default {
  --kbd-bg: oklch(0.9731 0 0);
  --kbd-text: oklch(0.2768 0 0);
  --kbd-border: oklch(0.873 0 0);
  --kbd-border-bottom: oklch(0.6698 0 0);
  --kbd-shadow: oklch(0 0 0 / 20%);

  display: inline-flex;
  align-items: center;
  background-color: var(--kbd-bg);
  color: var(--kbd-text);
  border: 1px solid var(--kbd-border);
  box-shadow:
    0 2px 0 var(--kbd-border-bottom),
    0 3px 2px var(--kbd-shadow);
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.75rem;
  line-height: 0.875rem;
  padding: 2px 6px;
  user-select: none;
  -webkit-user-select: none;
  cursor: default;
  transition:
    transform 0.1s ease,
    box-shadow 0.1s ease;
}

html.dark kbd.default {
  --kbd-bg: oklch(0.329 0 0);
  --kbd-text: oklch(0.8452 0 0);
  --kbd-border: oklch(0.4091 0 0);
  --kbd-border-bottom: oklch(0.2603 0 0);
  --kbd-shadow: oklch(0 0 0 / 40%);
}

kbd.default:active {
  transform: translateY(2px);
  box-shadow:
    0 0 0 var(--kbd-border-bottom),
    0 1px 2px var(--kbd-shadow);
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

kbd.flat.ghost {
  background-color: var(--color-ghost-hover);
  color: var(--color-on-ghost-muted);
}

kbd.flat.action {
  background-color: var(--color-action-hover);
  color: var(--color-on-action-muted);
}
</style>
