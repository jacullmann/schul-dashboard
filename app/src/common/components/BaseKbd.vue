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
  display: inline-flex;
  align-items: center;
  background-color: var(--color-kbd-bg);
  color: var(--color-kbd-text);
  border: 1px solid var(--color-kbd-border);
  box-shadow:
    0 2px 0 var(--color-kbd-border-bottom),
    0 3px 2px var(--color-kbd-shadow);
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

kbd.default:active {
  transform: translateY(2px);
  box-shadow:
    0 0 0 var(--color-kbd-border-bottom),
    0 1px 2px var(--color-kbd-shadow);
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
