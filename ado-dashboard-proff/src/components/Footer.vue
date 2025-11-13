<template>
  <footer class="footer">
    <div class="footer-container container">
      <div class="footer-columns">
        <div class="footer-section">
          <h3>Feedback</h3>
          <p>Teile deine Erfahrungen mit uns und sorge für eine sichere Umgebung. Wir nehmen Feedback gerne an und versuchen stetig, uns zu verbessern.</p>
        </div>

        <div class="footer-section">
          <h3>Links</h3>
          <router-link to="/" class="footer-link">Dashboard</router-link>
          <router-link  to="/stundenplan" class="footer-link">Stundenplan</router-link>
          <router-link  to="/kuerzel" class="footer-link">Kürzelfinder</router-link>
          <router-link  to="/impressum-&-datenschutz/impressum" class="footer-link">Datenschutz & Impressum</router-link>
          <router-link  to="/sorgenbox" class="footer-link">Sorgenbox</router-link>
          <router-link  to="/countdown" class="footer-link">Countdowns</router-link>
        </div>

        <div class="footer-section">
          <h3>Kontakt</h3>
          <p @click="toContact" class="superjob">dashboardverifizierung@gmail.com</p>
          <router-link  to="/kontakt" class="footer-link">Kontakt</router-link>

        </div>
        <All  class="logoutDeviceMobile" />
      </div>
    </div>

    <AnimatedGradientLine />

    <div class="footer-bottom">
      <div class="container footer-bottom-content">
        <p>© {{ year }} — Alle Rechte vorbehalten</p>
        <All  class="logoutDeviceDesktop" />

      </div>

    </div>


  </footer>
</template>

<script setup lang="ts">
import { ref } from "vue";
import router from "../router";
import AnimatedGradientLine from "./animations/AnimatedGradientLine.vue";

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

function toContact() {
  router.push('/kontakt')
}

function handleClick() {
  clickCount.value++;

  if (!timer) {
    timer = window.setTimeout(() => {
      clickCount.value = 0;
      timer = null;
    }, 2000);
  }

  if (clickCount.value >= 5) {
    showOverlay.value = true;
    clickCount.value = 0;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }
}
</script>

<style scoped>
.footer {
  background-color: var(--bg);
  color: #f1f1f1;
  padding: 2rem 5px 5px;
  border-top: 1px solid #333;
}
.superjob {
  cursor: pointer;
  max-width: 185px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

}
.superjob:hover {
  white-space: normal;
  overflow: visible;
  position: relative;

}

.footer-container {
  padding-bottom: 2rem;
}

.footer-columns {
  display: flex;
  justify-content: flex-start;
  gap: 4rem;
  flex-wrap: wrap;
}

.footer-section {
  flex-basis: 200px;
  flex-grow: 1;
}

.footer-section h3 {
  color: #f1f1f1;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.footer-section p {
  font-size: 0.9rem;
  line-height: 1.6;
}

.footer-link {
  display: block;
  color: var(--text);
  text-decoration: none;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: #b0b0b0;
}

.footer-bottom {
  border-top: 1px solid #333;
  padding: 2rem 1px;
  font-size: 0.8rem;
}

.footer-bottom-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.secret-btn {
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  font-size: 0.5rem;
  transition: color 0.3s ease;
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
}
</style>
