<script setup lang="ts">
import Logo from "../../components/hw/Logo.vue";
</script>

<template>
  <header class="header">
    <div class="header-content-wrapper"> <div class="logo-container">
      <Logo class="logo-img" aria-hidden="true" />
      <span class="logo-text">Schul-Dashboard</span>
    </div>
      <nav class="nav-links">
      </nav>
    </div> </header>
</template>

<style scoped>
.header {
  width: 100%;
  height: 70px;
  background-color: var(--bg);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}

.header-content-wrapper {
  width: 100%;
  max-width: 1400px;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 5rem;
  box-sizing: border-box;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-img {
  height: 38px;
  width: auto;
}

.logo-text {
  font-weight: bold;
  font-size: 1.6rem;
  white-space: nowrap;
}
.nav-links {
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
}

@media (max-width: 768px) {
  .header {
    padding: 0 1.5rem;
  }
  .header-content-wrapper {
    padding: 0 0.3rem;
  }
}
</style>