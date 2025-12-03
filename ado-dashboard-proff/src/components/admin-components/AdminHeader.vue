<template>
  <header class="admin-header">
    <div class="admin-header-title" >Admin</div>
    <router-link to="/" class="back">Zurück</router-link>
  </header>
</template>

<script setup lang="ts">
</script>

<style scoped>
.admin-header {
  height: var(--admin-header-height);
  padding: 0 40px;
  background: #141414;
  color: #f1f1f1;
  border-bottom: 1px solid #282828;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  justify-content: space-between;
  gap: 10px;
}

.admin-header-title {
  font-size: 1.5rem;
  font-weight: 700;
}
.back {
  color: var(--text);
}

@media (max-width: 768px) {
  .admin-header {
    padding: 0 20px;
    height: 50px;
  }
}
</style>