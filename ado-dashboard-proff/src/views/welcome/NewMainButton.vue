<template>
  <button
      class="main-dashboard-btn"
      @click="$emit('click')"
      type="button"
      draggable="true"
  >
    <span class="btn-content">
      <slot>Jetzt loslegen</slot>
    </span>
  </button>
</template>

<script setup lang="ts">
</script>

<style scoped>
.main-dashboard-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 32px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.25s ease;
  background-color: var(--text);
  color: var(--bg);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  user-select: none;
  white-space: nowrap;
}

.btn-content {
  position: relative;
  z-index: 2;
}

.main-dashboard-btn:hover {
  background: var(--sub);
}
@media (prefers-color-scheme: dark) {
  .main-dashboard-btn {
  }
}
</style>