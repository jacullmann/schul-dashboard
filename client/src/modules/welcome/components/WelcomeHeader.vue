<script setup lang="ts">
import { RouterLink } from 'vue-router';
import AppLogo from "@/common/components/AppLogo.vue";
</script>

<template>
  <header class="header">
    <div class="header-content-wrapper">
      <RouterLink to="/" class="logo-container">
        <AppLogo class="logo-img" aria-label="Website Logo"/>
        <span class="logo-text">schul-dashboard</span>
      </RouterLink>
    </div>
  </header>
</template>

<style scoped>
.header {
  width: 100%;
  padding: 12px;
  background-color: var(--color-canvas);
  color: var(--color-on-surface);
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  border-bottom: 1px solid var(--color-canvas-border);
}

.header-content-wrapper {
  width: 100%;
  max-width: 1400px;
  height: 100%;
  display: flex;
  justify-content: left;
  align-items: center;
  padding: 0;
  box-sizing: border-box;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-img {
  height: 32px;
  width: auto;
}

.logo-text {
  font-weight: bold;
  font-size: 1.6rem;
  white-space: nowrap;
  line-height: 32px;
  font-family: var(--font-display), sans-serif;
  color: var(--color-on-surface);
}

/*.nav-links {
  display: flex;
  gap: 24px;
}

.nav-item {
  text-decoration: none;
  color: #cccccc;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-item:hover {
  color: #ffffff;
}*/

@media (max-width: 368px) {
  .logo-text {
    font-size: var(--text-h2);
    line-height: 26px;
  }

  .logo-img {
    height: 26px;
  }
}
</style>