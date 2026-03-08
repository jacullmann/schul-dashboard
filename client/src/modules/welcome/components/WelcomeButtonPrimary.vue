<template>
  <button
      class="main-dashboard-btn"
      type="button"
      draggable="true"
  >
    Jetzt loslegen
  </button>
</template>

<script setup lang="ts">
</script>

<style scoped>
.main-dashboard-btn {
  transition: all 0.25s ease;
  background-color: var(--text);
  color: var(--bg);
  border: none;
}
.main-dashboard-btn:hover {
  background: var(--sub);
}
</style>