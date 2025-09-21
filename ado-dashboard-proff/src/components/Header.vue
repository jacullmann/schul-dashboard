<template>
  <header class="header">
    <div class="header-container container">
      <ButtonBack v-if="shouldShowBackButton" class="back-button-in-header">
        Zurück
      </ButtonBack>
      <router-link to="/" class="logo" @click="closeNav">Bewertungen</router-link>

      <button @click="toggleNav" class="hamburger-menu">
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
      </button>

      <nav :class="['nav-links', { 'nav-links-open': navOpen }]">
        <router-link to="/" class="nav-item" @click="closeNav">Übersicht</router-link>
        <router-link to="/hausaufgaben" class="nav-item" @click="closeNav">Hausaufgaben</router-link>
        <router-link to="/admin" class="nav-item" @click="closeNav">Admin</router-link>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import ButtonBack from './ButtonBack.vue';

const navOpen = ref(false);
const route = useRoute();

const shouldShowBackButton = computed(() => {
  return route.path.startsWith('/person/');
});

const toggleNav = () => {
  navOpen.value = !navOpen.value;
};

const closeNav = () => {
  navOpen.value = false;
};
</script>

<style scoped>
.header {
  background-color: #1a1a1a;
  color: #f0f0f0;
  padding: 0.9rem 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: background-color 0.3s ease;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

/* Stile für den Zurück-Button */
.back-button-in-header {
  background-color: var(--card);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  padding: 8px 12px;
  cursor: pointer;
  z-index: 10;
  overflow: hidden;
  position: relative;
  transition: transform 0.3s ease;
}

.back-button-in-header:hover {
  transform: translateY(-2px);
  background-color: #2a2a2a;
}

.logo {
  font-size: 1.8rem;
  font-weight: bold;
  text-decoration: none;
  color: #f0f0f0;
  letter-spacing: 1px;
  transition: color 0.3s ease;
  flex: 1;
  text-align: center;
}

.logo:hover {
  color: #41d1ff;
}

.hamburger-menu {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 30px;
  height: 21px;
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 10;
}

.bar {
  width: 100%;
  height: 3px;
  background-color: #f0f0f0;
  transition: all 0.3s ease-in-out;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  transition: all 0.5s ease-in-out;
}

.nav-item {
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  color: #b0b0b0;
  position: relative;
  transition: color 0.3s ease, transform 0.3s ease;
}

.nav-item:hover {
  color: #fff;
  transform: translateY(-2px);
}

.nav-item::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -5px;
  width: 100%;
  height: 2px;
  background-color: #bd34fe;
  transform: scaleX(0);
  transition: transform 0.3s ease-in-out;
}

.nav-item:hover::after {
  transform: scaleX(1);
}

/* Responsive Design */
@media (max-width: 768px) {
  .hamburger-menu {
    display: flex;
  }

  .nav-links {
    position: fixed;
    top: 0;
    right: 0;
    width: 250px;
    height: 100%;
    background-color: #242424;
    flex-direction: column;
    align-items: flex-start;
    padding: 2rem;
    transform: translateX(100%);
    transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    z-index: 9;
    box-shadow: -4px 0 10px rgba(0, 0, 0, 0.2);
  }

  .nav-links-open {
    transform: translateX(0);
  }

  .nav-item {
    margin: 1rem 0;
    font-size: 1.2rem;
  }
}
</style>