<template>
  <footer class="footer">
    <div class="footer-container container">
      <div class="footer-grid">
        <div class="footer-section footer-brand">
          <div class="brand-header">
            <Logo class="footer-logo" aria-hidden="true" />
            <span class="brand-text">Dashboard</span>
          </div>
          <Notizen />
          <p class="brand-description">
            Teile deine Erfahrungen mit uns und sorge für eine sichere Umgebung. Wir nehmen Feedback gerne an und versuchen stetig, uns zu verbessern.
          </p>
        </div>

        <div class="footer-section">
          <h3>Navigation</h3>
          <router-link to="/" class="footer-link">Dashboard</router-link>
          <router-link to="/stundenplan" class="footer-link">Stundenplan</router-link>
          <router-link to="/kuerzel" class="footer-link">Kürzelfinder</router-link>
          <router-link to="/sorgenbox" class="footer-link">Sorgenbox</router-link>
          <router-link to="/countdown" class="footer-link">Countdowns</router-link>
          <router-link to="/daltonraumfinder" class="footer-link">Daltonraumfinder</router-link>
          <router-link to="/update-history" class="footer-link">Update History</router-link>
          <router-link to="/info-dashboard" class="footer-link">Info Dashboard</router-link>
        </div>

        <div class="footer-section">
          <h3>Rechtliches</h3>
          <router-link to="/impressum-&-datenschutz/impressum" class="footer-link">Impressum</router-link>
          <router-link to="/impressum-&-datenschutz/datenschutz" class="footer-link">Datenschutz</router-link>
          <router-link to="/impressum-&-datenschutz/nutzung" class="footer-link">Nutzungsbedingungen</router-link>
        </div>
        <div class="footer-section">
          <h3>Kontakt</h3>
          <router-link to="/kontakt" class="footer-link">Kontakt</router-link>
        </div>
        <div class="footer-section">
          <h3>Einstellungen</h3>
          <div class="theme-selector">
            <label for="theme-select" class="theme-label">Theme</label>
            <select
                id="theme-select"
                :value="selectedThemeMode"
                @change="handleThemeChange"
                class="theme-select input hover"
            >
              <option value="system">System</option>
              <option value="light">Heller Modus</option>
              <option value="dark">Dunkler Modus</option>
            </select>
          </div>
          <p class="brand-description">
            Wähle dein bevorzugtes Farbschema für das Schul-Dashboard aus.
          </p>

        </div>
        <All  class="logoutDeviceMobile" />
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container footer-bottom-content">
        <p class="copyright-text">© {{ year }} Schul-Dashboard</p>
        <All  class="logoutDeviceDesktop" />

      </div>

    </div>


  </footer>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useTheme, ThemeMode } from '../composables/useTheme';
import All from './AllLogoutButton.vue';
import Logo from './hw/Logo.vue';
import Notizen from "./Notizen.vue";

const year = new Date().getFullYear();
const { selectedThemeMode, applyTheme } = useTheme();

function handleThemeChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  applyTheme(target.value as ThemeMode);
}

function openCookieBanner() {
  window.dispatchEvent(new CustomEvent('open-cookie-banner'))
}
</script>

<style scoped>
.footer {
  background-color: var(--bg);
  color: var(--text);
  padding: 3rem 0 0;
  border-top: 1px solid var(--border);
  font-family: var(--display-font), sans-serif;
}

.footer-container {
  padding-bottom: 2.5rem;
}

.container{
  max-width: 1300px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
  gap: 18px;
}

.footer-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Brand Section */
.footer-brand {
  gap: 0.5rem;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.footer-logo {
  width: auto;
  height: 28px;
}

.brand-text {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
}

.brand-description {
  color: var(--sub);
  margin-top: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
}

.footer-section h3 {
  color: var(--text);
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.footer-link {
  display: block;
  color: var(--sub);
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.2s;
  font-weight: 500;
}

.footer-link:hover {
  color: var(--text);
}

.theme-selector {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.theme-label {
  font-size: 0.95rem;
  color: var(--sub);
  font-weight: 600;
}

.theme-select {
  max-width: 180px;
}

/* Footer Bottom */
.footer-bottom {
  border-top: 1px solid var(--border);
  padding: 1.5rem 0;
  font-size: 0.85rem;
}

.footer-bottom-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.copyright-text {
  color: var(--sub);
  margin: 0;
}
.logoutDeviceMobile {
  display: none;
}
.logoutDeviceDesktop {
  display: block;
}

/* Responsive */
@media (max-width: 1024px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }

  .footer-brand {
    grid-column: 1 / -1;
  }
  .footer-section h3 {
    margin: 2rem 0 0.25rem;
  }
}

@media (max-width: 768px) {
  .footer {
    padding: 2rem 16px 5px;
  }

  .footer-container {
    padding-bottom: 2rem;
  }

  .footer-grid {
    grid-template-columns: 1fr;
  }

  .footer-brand {
    grid-column: auto;
  }

  .footer-bottom-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .theme-select {
    max-width: 100%;
  }
  .logoutDeviceMobile {
    display: block;
  }
  .logoutDeviceDesktop {
    display: none;
  }
}

@media (max-width: 480px) {
  .brand-text {
    font-size: 1.3rem;
  }
}
</style>