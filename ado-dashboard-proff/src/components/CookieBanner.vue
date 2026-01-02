<template>
  <div v-if="visible" class="cookie-banner">
    <div class="cookie-content">
      <div>
        <h3 style="margin: 0">
          Cookies
        </h3>
      </div>
      <div class="cookie-text">
        <p>Wir nutzen Cookies, um grundlegende Funktionen wie Anmeldung, Sicherheit und den Betrieb des Schul-Dashboards zuverlässig bereitzustellen.

          Zusätzlich verwenden wir das datenschutzfreundliche Analyse-Tool Umami (Cloud-Dienst), um zu verstehen, wie unsere Seite genutzt wird und sie weiter zu verbessern. Umami arbeitet ohne Tracking-Cookies und speichert keine personenbezogenen Daten.

          Mehr dazu findest du in unserer <a @click="toData" class="data-link" style="cursor: pointer">Datenschutzerklärung</a>.</p>
      </div>

      <div class="cookie-actions">
        <!--<button data-umami-event="Cookies ablehnen" class="btn btn-ghost" @click="revoke">Ablehnen</button>-->
        <button data-umami-event="Cookies-Hinweis bestätigt" class="btn ghost" @click="accept">Verstanden</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useAppAuth } from '../composables/useAppAuth';
import { useRouter } from 'vue-router';

const auth = useAppAuth();
const visible = ref(false);
const router = useRouter();

function accept() {
  const payload = { accepted: true, expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() };
  localStorage.setItem('cookie_consent', JSON.stringify(payload));
  visible.value = false;
}
function toData(){
  router.push('/impressum-&-datenschutz/datenschutz');
}
function revoke() {
  localStorage.removeItem('cookie_consent');
  visible.value = false;
}

function checkShow() {
  //if (!auth.isAuthenticated.value) {
  //visible.value = false;
  //return;
  //}
  const raw = localStorage.getItem('cookie_consent');
  if (!raw) {
    visible.value = true;
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.accepted || new Date() > new Date(parsed.expires)) visible.value = true;
    else visible.value = false;
  } catch {
    visible.value = true;
  }
}

onMounted(() => {
  checkShow();
});

onBeforeUnmount(() => {
});
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 16px;
  right: 16px;
  max-width: 420px;
  border: 1px solid var(--border2);
  border-radius: 16px;
  background: var(--lbg);
  box-shadow: var(--shadow-l);
  z-index: 1200;
  padding: 0;
  transition: all 0.3s ease;
}

.cookie-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.cookie-text {
  font-size: 13px;
  color: var(--text);
  line-height: 1.6;
}
.cookie-text p {
  margin: 0;
}

.data-link {
  color: var(--sub);
  transition: color 0.1s ease;
  text-decoration: underline;
}

.data-link:hover {
  color: var(--text);
}

.cookie-actions {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 500px) {
  .cookie-banner {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 32px);
    bottom: 20px;
    box-shadow: var(--shadow-l);
  }

  .cookie-actions {
    justify-content: left;
  }
}
</style>