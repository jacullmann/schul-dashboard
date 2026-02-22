<template>
  <button
      class="main-dashboard-btn"
      type="button"
      draggable="true"
  >
     Mehr erfahren
  </button>
</template>

<script setup lang="ts">
</script>

<style scoped>
.main-dashboard-btn {
  transition: all 0.25s ease;
  background-color: var(--bg);
  color: var(--text);
  border: none;
}
.main-dashboard-btn:hover {
  background: var(--bg);
}
</style>