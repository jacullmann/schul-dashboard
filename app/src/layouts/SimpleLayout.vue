<script setup lang="ts"></script>

<template>
  <div class="simple-layout">
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.simple-layout {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-canvas);
}

.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  box-sizing: border-box;
}
</style>
