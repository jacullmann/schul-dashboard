<template>
  <header class="header">
    <div class="header-container container">
      <router-link to="/" class="logo-group" @click="closeNav">
        <Logo class="logo-img" aria-hidden="true" />
        <span class="logo-text">Dashboard</span>
      </router-link>

      <button
          @click="toggleNav"
          :class="['hamburger-menu', { 'hamburger-menu--open': navOpen }]"
          aria-label="Menü öffnen oder schließen"
          v-if="!navOpen"
          data-umami-event="Mobile Menu öffnen"
      >
        <Menu style="color: #fff" size="25px"/>
      </button>

      <div v-if="navOpen" class="nav-overlay" @click="closeNav"></div>

      <nav :class="['nav-links', { 'nav-links-open': navOpen }]">
        <button @click="closeNav" class="nav-close-button" aria-label="Menü schließen">
          <X />
        </button>

        <router-link to="/" class="nav-item" @click="closeNav">Dashboard</router-link>

        <!-- NEU: Admin Link (bedingte Anzeige) -->
        <router-link
            v-if="user?.isAdmin"
            to="/admin-dashboard"
            class="nav-item admin-link"
            @click="closeNav"
        >
          Admin-Dashboard
        </router-link>

        <router-link to="/stundenplan" class="nav-item" @click="closeNav">Stundenplan</router-link>
        <router-link to="/kuerzel" class="nav-item" @click="closeNav">Kürzel-Finder</router-link>
        <router-link to="/sorgenbox" class="nav-item" @click="closeNav">Sorgenbox</router-link>
        <router-link to="/countdown" class="nav-item" @click="closeNav">Countdowns</router-link>
        <router-link to="/daltonraumfinder" class="nav-item" @click="closeNav">Daltonraum-Finder</router-link>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Logo from './hw/Logo.vue'
import { X, Menu } from 'lucide-vue-next'
import { useHausaufgaben } from '../composables/useHausaufgaben';

const { user } = useHausaufgaben();
const navOpen = ref(false);

const toggleNav = () => {
  navOpen.value = !navOpen.value;
  document.body.style.overflow = navOpen.value ? 'hidden' : '';
};

const closeNav = () => {
  navOpen.value = false;
  document.body.style.overflow = '';
};

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && navOpen.value) closeNav();
};

onMounted(() => document.addEventListener('keydown', handleEscape));
onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.header {
  background-color: var(--bg);
  color: #f1f1f1;
  padding: 0.1rem 0;
  position: sticky;
  top: 0;
  z-index: 1002;
  transition: background-color 0.3s ease;
  border-bottom: 1px solid var(--border);
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  position: relative;
}
.logo-group {
  display: flex;
  align-items: center;
  text-decoration: none;
  gap: 0.6rem;
  color: #f1f1f1;
  flex: 0 1 auto;
  justify-content: center;
  margin-right: auto;
}

.logo-img { width: auto; height: 35px; }
.logo-text { font-size: 1.8rem; font-weight: bold; letter-spacing: 1px; transition: opacity 0.2s ease; line-height: 1; }

.hamburger-menu { display: none; flex-direction: column; justify-content: space-between; background: transparent; border: none; cursor: pointer; z-index: 1010; position: relative; }
.nav-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 998; animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.nav-links { display: flex; gap: 1.25rem; transition: all 0.2s ease; }
.nav-item { font-size: 1rem; font-weight: 600; text-decoration: none; color: #f1f1f1; position: relative; transition: opacity 0.2s ease; }
.nav-item:hover { opacity: 0.7; }


.nav-close-button { display: none; position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #f0f0f0; cursor: pointer; padding: 0.5rem; border-radius: 4px; transition: background-color 0.3s ease; z-index: 1002; }
.nav-close-button:hover { background-color: rgba(255, 255, 255, 0.1); }

@media (max-width: 768px) {
  .header { padding: 16px; }
  .hamburger-menu { display: flex; }
  .nav-close-button { display: block; }

  .nav-links { position: fixed; top: 0; right: 0; width: 280px; height: 100%; background-color: #1a1a1a; flex-direction: column; align-items: flex-start; padding: 4rem 2rem 2rem; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); z-index: 999; box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3); overflow-y: auto; }
  .nav-links-open { transform: translateX(0); }
  .nav-item { margin: 1rem 0; font-size: 1.2rem; width: 100%; padding: 0.5rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
  .nav-item:last-child { border-bottom: none; }
  .nav-item:hover { opacity: 1; }
}

@media (max-width: 768px) and (max-height: 800px) {
  .nav-links { padding-top: 3rem; }
}
</style>