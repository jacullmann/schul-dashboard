<!-- src/views/AuthPage.vue -->
<template>
  <div class="container" style="max-width:480px; margin:80px auto;">
    <div class="card">
      <h2 style="margin-top:0">Anmelden</h2>
      <p class="small">Bitte gib den Zugangscode ein, um die Seite zu verwenden.</p>

      <div style="margin:12px 0;">
        <input v-model="code" placeholder="Zugangscode" class="input" @keyup.enter="submit" />
      </div>

      <div style="display:flex; gap:8px; align-items:center; margin-top:12px;">
        <button class="btn" @click="submit">Anmelden</button>
        <button v-if="auth.isAuthenticated" class="btn ghost" @click="doLogout">Abmelden</button>
      </div>

      <p v-if="error" class="small" style="color:var(--danger); margin-top:10px;">{{ error }}</p>

      <hr />

      <div class="small" style="color:var(--muted);">
        Anmeldung bleibt für 30 Tage aktiv. Seite ist derzeit rein lokal abgesichert.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const auth = useAuth();
const code = ref('');
const error = ref<string | null>(null);

function submit() {
  error.value = null;
  const res = auth.loginWithCode(code.value.trim());
  if (res.ok) {
    // Option: weiterleiten zur Startseite oder zur ursprünglichen Route, falls gespeichert
    // Wir leiten standardmäßig zu /items/HAUSAUFGABE
    auth.refreshExpiry();
    router.push('/items/HAUSAUFGABE');
  } else {
    error.value = res.error || 'Login fehlgeschlagen';
  }
}

function doLogout() {
  auth.logout();
  // Bleibe auf der /auth Seite
}
</script>

<style scoped>
.card { background: var(--card); padding: 18px; border-radius: 12px; }
.input { padding: 10px; border-radius:6px; border: none; background:#222; color:var(--text); width:100%; }
.btn { padding: 8px 12px; border-radius:6px; cursor:pointer; }
.btn.ghost { background: transparent; color: var(--text); border: 1px solid #444; }
.small { font-size:13px; color:var(--muted); }
</style>
