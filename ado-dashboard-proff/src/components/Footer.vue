<template>
  <footer class="footer">
    <div class="footer-container container">
      <div class="footer-columns">
        <div class="footer-section">
          <h3>Feedback</h3>
          <p>Teile deine Erfahrungen mit uns und sorge für eine sichere Umgebung. Wir nehmen Feedback gerne an und versuchen stetig, uns zu verbessern.</p>
        </div>

        <div class="footer-section">
          <h3>Navigation</h3>
          <router-link to="/" class="footer-link">Dashboard</router-link>
          <router-link  to="/stundenplan" class="footer-link">Stundenplan</router-link>
          <router-link  to="/kuerzel" class="footer-link">Kürzelfinder</router-link>
          <router-link  to="/impressum-&-datenschutz/impressum" class="footer-link">Datenschutz & Impressum</router-link>
          <router-link  to="/sorgenbox" class="footer-link">Sorgenbox</router-link>
          <router-link  to="/countdown" class="footer-link">Countdowns</router-link>
          <router-link  to="/daltonraumfinder" class="footer-link">Daltonraumfinder</router-link>
        </div>

        <div class="footer-section">
          <h3>Kontakt</h3>
          <router-link  to="/kontakt" class="footer-link">Kontakt</router-link>
        </div>
        <All  class="logoutDeviceMobile" />
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container footer-bottom-content">
        <p class="copyright-text">© {{ year }} — Alle Rechte vorbehalten</p>
        <All  class="logoutDeviceDesktop" />

      </div>

    </div>


  </footer>
</template>

<script setup lang="ts">
import { ref } from "vue";
import router from "../router";
// import AnimatedGradientLine from "./animations/AnimatedGradientLine.vue";

import All from './AllLogoutButton.vue'

const year = new Date().getFullYear();


const clickCount = ref(0);
const showOverlay = ref(false);


const videoId = "HAfFfqiYLp0";

let timer: number | null = null;

function openCookieBanner() {
  window.dispatchEvent(new CustomEvent('open-cookie-banner'))
}

//async function logout() {
//try {
//await fetch('/api/auth/access/logout', { method: 'POST', credentials: 'include' });
//} catch { /* ignore */ }
//window.dispatchEvent(new Event('site-logged-out'));
//router.push('/login');
//}
</script>

<style scoped>
.footer {
  background-color: var(--bg);
  color: #f1f1f1;
  padding: 2.5rem 0 0;
  border-top: 1px solid var(--border);
  font-family: var(--display-font), sans-serif;
}

.footer-container {
  padding-bottom: 2.5rem;
}

.footer-columns {
  display: flex;
  justify-content: flex-start;
  gap: 3rem;
  flex-wrap: wrap;
}

.footer-section {
  flex-basis: 200px;
  flex-grow: 1;
}

.footer-section h3 {
  color: #f1f1f1;
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 1.2rem;
}

.footer-section p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  line-height: 1.6;
}

.footer-link {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  transition:  0.2s;
  font-weight: 500 }

.footer-link:hover {
  color: rgba(255, 255, 255, 1);
}

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
  color: rgba(255, 255, 255, 0.5);
}
.logoutDeviceMobile{
  display: none;
}


@media (max-width: 768px) {
  .footer-columns {
    flex-direction: column;
    gap: 1.5rem;
    text-align: left;
  }
  .logoutDeviceMobile {
    display: inherit;
  }
  .logoutDeviceDesktop {
    display: none;
  }

  .footer-bottom-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .footer {
    /* Padding anpassen, falls du den Container in Mobile benutzt */
    padding: 2rem 16px 5px;
  }
}
</style>