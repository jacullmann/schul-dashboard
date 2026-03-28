<template>
  <kbd>
    <slot />
  </kbd>
</template>

<style scoped>
kbd {
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

kbd:active {
  transform: translateY(2px);
  box-shadow: 0 0px 0 var(--color-kbd-border-bottom), 0 1px 2px var(--color-kbd-shadow);
}
</style>