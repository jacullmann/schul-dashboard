<template>
  <header class="header">
    <div class="header-container container">
      <ButtonBack v-if="shouldShowBackButton" class="back-button-in-header">
        Zurück
      </ButtonBack>

      <router-link to="/" class="logo" @click="closeNav">Dashboard</router-link>

      <button
          @click="toggleNav"
          :class="['hamburger-menu', { open: navOpen }]"
          :aria-expanded="navOpen"
          aria-label="Navigation öffnen schließen"
      >
        <span class="bar top"></span>
        <span class="bar middle"></span>
        <span class="bar bottom"></span>
      </button>

      <!-- Backdrop: schließt das Menü beim Tippen außerhalb -->
      <div v-if="navOpen" class="nav-backdrop" @click="closeNav" aria-hidden="true"></div>

      <nav :class="['nav-links', { 'nav-links-open': navOpen }]" role="navigation" aria-hidden="false">
        <router-link to="/" class="nav-item" @click="closeNav">Dashboard</router-link>
        <router-link to="/bewerten" class="nav-item" @click="closeNav">Benoten</router-link>
        <router-link to="/stundenplan" class="nav-item" @click="closeNav">Stundenplan</router-link>
        <router-link to="/kuerzel" class="nav-item" @click="closeNav">Kürzel-Finder</router-link>
        <router-link to="/fresser" class="nav-item" @click="closeNav">Fresser</router-link>
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
  return (
      route.path.startsWith('/person/') ||
      route.path.startsWith('/admin') ||
      route.path.startsWith('/impressum-&-datenschutz')
  );
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
}

/* Zurück-Button */
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

/* Default hamburger (hidden on desktop) */
.hamburger-menu {
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 36px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  z-index: 1001;
  transition: transform 220ms ease;
}

/* Bars as positioned spans for smoother morph */
.hamburger-menu .bar {
  display: block;
  width: 22px;
  height: 2.5px;
  background-color: #f0f0f0;
  border-radius: 2px;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease, width 240ms ease;
  transform-origin: center;
  margin: 4px 0;
}
.hamburger-menu .bar.top { transform-origin: 3px 50%; }
.hamburger-menu .bar.bottom { transform-origin: 3px 50%; }

/* Open state: morph to X */
.hamburger-menu.open { transform: none; }
.hamburger-menu.open .bar.top {
  transform: translateY(6.5px) rotate(45deg) scaleX(1.05);
}
.hamburger-menu.open .bar.middle {
  opacity: 0;
  transform: scaleX(0.2);
}
.hamburger-menu.open .bar.bottom {
  transform: translateY(-6.5px) rotate(-45deg) scaleX(1.05);
}

/* Nav items / desktop */
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

/* Mobile responsive behavior */
@media (max-width: 768px) {
  .hamburger-menu { display: flex; }

  /* nav as slide-in panel */
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
    /* sanfte Ease-Out Kurve, kein Overshoot; Dauer 420ms fühlt sich natürlich an */
    transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 300ms ease;
    will-change: transform;
    z-index: 999;
    box-shadow: -4px 0 10px rgba(0, 0, 0, 0.2);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  /* open: exact edge */
  .nav-links-open { transform: translateX(0); }

  .nav-item {
    margin: 1rem 0;
    font-size: 1.2rem;
  }

  /* Backdrop that sits behind the nav and closes on click */
  .nav-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    z-index: 998;
    opacity: 1;
    transition: opacity 200ms ease;
  }

  /* Prevent mobile overscroll causing a small gap on some browsers */
  html, body {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }
}

/* small accessibility and visual tweaks */
@media (prefers-reduced-motion: reduce) {
  .hamburger-menu .bar,
  .nav-links {
    transition: none !important;
    animation: none !important;
  }
}
</style>
