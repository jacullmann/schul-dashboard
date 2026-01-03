<script setup lang="ts">
import Logo from "../../components/hw/Logo.vue";
const emit = defineEmits(['goToMain2'])
</script>

<template>
  <header class="header">
    <div class="header-content-wrapper">
      <div @click="emit('goToMain2')" class="logo-container">
        <Logo class="logo-img" aria-label="Website Logo"/>
        <span class="logo-text">Schul Dashboard</span>
      </div>
    </div>
  </header>
  <div class="example-announcement">
    <span>Chemie fällt morgen aus</span>
  </div>
</template>

<style scoped>
.header {
  width: 100%;
  padding: 12px;
  background-color: var(--bg);
  color: var(--text);
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  border-bottom: 1px solid var(--border);
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
}

.example-announcement {
  background: var(--vlbg);
  border-block: 1px solid var(--border2);
  padding: 10px 12px;
  border-radius: 0;
  font-family: var(--normal-font), sans-serif;
  font-size: 16px;
  text-align: center;
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
</style>