<template>
  <button class="btn button-back" @click="goBack">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goBack() {
  router.back();
}
</script>

<style scoped>
.button-back {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 999;
  padding: 12px 20px;
  background-color: var(--card);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease, background-color 0.3s ease;
}

.button-back:hover {
  transform: translateY(-2px);
  background-color: #2a2a2a;
}
</style>