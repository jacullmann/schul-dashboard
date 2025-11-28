<script setup lang="ts">
const emit = defineEmits(['click']);

function handleClick() {
  emit('click');
}
</script>

<template>
  <button @click="handleClick">
    Jetzt loslegen
  </button>
</template>

<style scoped>
button {
  all: unset;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
  box-sizing: border-box;
}
</style>