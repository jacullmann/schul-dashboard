<template>
  <div class="container" style="max-width:420px;margin:80px auto;">
    <div class="card">
      <h2>Anmelden</h2>
      <p class="small">Gib das Zugriffs-Passwort ein.</p>
      <input v-model="password" type="password" placeholder="Passwort" class="input" @keyup.enter="submit" />
      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn" @click="submit" :disabled="loading">{{ loading ? 'Anmelden...' : 'Anmelden' }}</button>
        <button class="btn ghost" @click="clear" v-if="password">Löschen</button>
      </div>
      <p class="small" v-if="error" style="color:var(--danger);margin-top:8px;">{{ error }}</p>
      <p class="small" style="margin-top:8px;">Hinweis: 30 Tage gültig auf diesem Gerät.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const password = ref('');
const loading = ref(false);
const error = ref('');
const router = useRouter();

async function submit() {
  error.value = '';
  if (!password.value) { error.value = 'Passwort erforderlich'; return; }
  loading.value = true;
  try {
    const res = await fetch('/api/auth/access', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    });
    const json = await res.json();
    if (!res.ok) {
      error.value = json?.error || 'Fehler';
      loading.value = false;
      return;
    }
    // Erfolg: Backend hat HttpOnly-Cookie gesetzt
    window.dispatchEvent(new Event('site-logged-in'));
    router.replace('/');
  } catch (e) {
    error.value = 'Netzwerkfehler';
  } finally {
    loading.value = false;
  }
}

function clear() { password.value = ''; }
</script>

<style scoped>
.card { padding:18px; border-radius:10px; }
@media (max-width:480px) {
  .container { padding: 12px; margin: 40px 12px; }
}
</style>
