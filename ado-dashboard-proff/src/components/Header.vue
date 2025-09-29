<template>
  <header class="header">
    <div class="header-container container">
      <ButtonBack v-if="shouldShowBackButton" class="back-button-in-header">
        Zurück
      </ButtonBack>

      <router-link to="/" class="logo" @click="closeNav">Dashboard</router-link>

      <button
          @click="toggleNav"
          :class="['hamburger-menu', { 'hamburger-menu--open': navOpen }]"
          aria-label="Menü öffnen oder schließen"
          v-if="!navOpen"
      >
        <div class="bar bar--1"></div>
        <div class="bar bar--2"></div>
        <div class="bar bar--3"></div>
      </button>

      <!-- Overlay für Klick außerhalb -->
      <div
          v-if="navOpen"
          class="nav-overlay"
          @click="closeNav"
      ></div>

      <nav :class="['nav-links', { 'nav-links-open': navOpen }]">
        <!-- Schließen-Button im mobilen Menü -->
        <button
            @click="closeNav"
            class="nav-close-button"
            aria-label="Menü schließen"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <router-link to="/" class="nav-item" @click="closeNav">
          Dashboard
        </router-link>
        <router-link to="/bewerten" class="nav-item" @click="closeNav">
          Benoten
        </router-link>
        <router-link to="/stundenplan" class="nav-item" @click="closeNav">
          Stundenplan
        </router-link>
        <router-link to="/kuerzel" class="nav-item" @click="closeNav">
          Kürzel-Finder
        </router-link>
        <router-link to="/fresser" class="nav-item" @click="closeNav">
          Fresser
        </router-link>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import ButtonBack from './ButtonBack.vue';

const navOpen = ref(false);
const route = useRoute();

const shouldShowBackButton = computed(() => {
  return (
      route.path.startsWith('/person/') ||
      route.path.startsWith('/admin') ||
      route.path.startsWith('/impressum-&-datenschutz')
  );
});

const toggleNav = () => {
  navOpen.value = !navOpen.value;

  // Body Scroll sperren/entsperren
  if (navOpen.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

const closeNav = () => {
  navOpen.value = false;
  document.body.style.overflow = '';
};

// ESC-Taste zum Schließen
const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && navOpen.value) {
    closeNav();
  }
};

// Event Listener hinzufügen/entfernen
onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
  document.body.style.overflow = ''; // Sicherstellen dass Scrollen wieder aktiviert wird
});
</script>

<style scoped>
.header {
  background-color: #1a1a1a;
  color: #f0f0f0;
  padding: 0.1rem 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1001;
  transition: background-color 0.3s ease;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  position: relative;
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

/* Hamburger Menu - Verbesserte Animation */
.hamburger-menu {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 30px;
  height: 21px;
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 1010;
  position: relative;
}

.bar {
  width: 100%;
  height: 3px;
  background-color: #f0f0f0;
  transition: all 0.3s cubic-bezier(0.68, -0.6, 0.32, 1.6);
  transform-origin: center;
}

/* Hamburger zu X Animation */
.hamburger-menu--open .bar--1 {
  transform: rotate(45deg) translate(6px, 6px);
}

.hamburger-menu--open .bar--2 {
  opacity: 0;
  transform: scaleX(0);
}

.hamburger-menu--open .bar--3 {
  transform: rotate(-45deg) translate(6px, -6px);
}

/* Overlay für Klick außerhalb */
.nav-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 998;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Navigation Links */
.nav-links {
  display: flex;
  gap: 1.5rem;
  transition: all 0.3s ease-in-out;
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

/* Schließen-Button im mobilen Menü */
.nav-close-button {
  display: none;
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: #f0f0f0;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.3s ease;
  z-index: 1002;
}

.nav-close-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Responsive Design */
@media (max-width: 768px) {
  .hamburger-menu {
    display: flex;
  }

  .nav-close-button {
    display: block;
  }

  .nav-links {
    position: fixed;
    top: 0;
    right: 0;
    width: 280px;
    height: 100%;
    background-color: #242424;
    flex-direction: column;
    align-items: flex-start;
    padding: 4rem 2rem 2rem;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    z-index: 999;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
    overflow-y: auto;
  }

  .nav-links-open {
    transform: translateX(0);
  }

  .nav-item {
    margin: 1rem 0;
    font-size: 1.2rem;
    width: 100%;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .nav-item:last-child {
    border-bottom: none;
  }

  .nav-item::after {
    display: none;
  }

  .nav-item:hover {
    transform: translateX(5px);
  }
}

/* No-Bounce Animation für iOS Geräte */
@media (max-width: 768px) and (max-height: 800px) {
  .nav-links {
    padding-top: 3rem;
  }
}
</style>