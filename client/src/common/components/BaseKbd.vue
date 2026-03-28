<template>
  <kbd>
    <slot />
  </kbd>
</template>

<style scoped>
kbd {
  display: inline-flex;
  align-items: center;
  background-color: #353535;
  color: #ccc;
  border: 1px solid #4a4a4a;
  border-bottom: 1px solid #242424;
  box-shadow: 0 2px 0 #242424, 0 3px 2px #0006;
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
  box-shadow: 0 0px 0 #242424, 0 1px 2px #0006;
}

:global(.light) kbd {
  background-color: #f6f6f6;
  color: #282828;
  border: 1px solid #d5d5d5;
  border-bottom: 1px solid #959595;
  box-shadow: 0 2px 0 #959595, 0 3px 2px #0003;
}

:global(.light) kbd:active {
  box-shadow: 0 0px 0 #959595, 0 1px 2px #0003;
}
</style>