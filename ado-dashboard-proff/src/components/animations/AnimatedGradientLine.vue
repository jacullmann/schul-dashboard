<template>
  <div class="animated-gradient-line"></div>
</template>

<script setup lang="ts">
// keine Logik nötig, das Ding lebt komplett im CSS
</script>

<style scoped>
.animated-gradient-line {
  width: 100%;
  height: 2px;
  background: linear-gradient(
      90deg,
      #6b57ff,
      #fe2857,
      #fddd3e,
      #6b57ff
  );
  background-size: 400% 100%;
  animation: gradientFlow 8s linear infinite;
  border-radius: 2px;
  opacity: 0.7;
}

/* Der Farbfluss nach rechts */
@keyframes gradientFlow {
  0% {
    background-position: 400% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
