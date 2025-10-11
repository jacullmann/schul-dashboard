<template>
  <div v-if="visible" class="cookie-banner card">
    <div style="display:flex; gap:12px; align-items:center;">
      <div class="small">Diese Seite verwendet Statistikcookies. Bitte zustimmen, um Analytics zu aktivieren.</div>
      <div style="margin-left:auto; display:flex; gap:8px;">
        <button data-umami-event="Cookies ablehnen" class="btn ghost" @click="revoke">Ablehnen</button>
        <button data-umami-event="Cookies akzepieren" class="btn" @click="accept">Akzeptieren</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useAuth } from '../composables/useAuth';

const auth = useAuth();
const visible = ref(false);

function accept() {
  const payload = { accepted: true, expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() };
  localStorage.setItem('cookie_consent', JSON.stringify(payload));
  window.dispatchEvent(new Event('cookie-accepted'));
  visible.value = false;
}

function revoke() {
  localStorage.removeItem('cookie_consent');
  window.dispatchEvent(new Event('cookie-revoked'));
  visible.value = false;
}

function checkShow() {
  if (!auth.isAuthenticated.value) {
    visible.value = false;
    return;
  }
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

function onAuthChanged() { checkShow(); }
function onStorage() { checkShow(); }

onMounted(() => {
  checkShow();
  window.addEventListener('auth-changed', onAuthChanged);
  window.addEventListener('storage', onStorage);
});

onBeforeUnmount(() => {
  window.removeEventListener('auth-changed', onAuthChanged);
  window.removeEventListener('storage', onStorage);
});
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 16px;
  right: 16px;
  max-width: 420px;
  padding: 12px;
  border-radius: 10px;
  background: var(--card);
  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
  z-index: 1200;
}
.small { font-size: 13px; color: var(--muted); }
.btn { padding: 8px 12px; border-radius: 6px; cursor: pointer; }
.btn.ghost { background: transparent; color: var(--text); border: 1px solid #444; }
</style>
