<template>
  <div class="card">
    <h2 style="margin-top:0;">E-Mail bestätigen</h2>
    <div v-if="loading">Prüfe Token...</div>
    <div v-else-if="ok" style="color:var(--primary)">Erfolg! Du kannst dich jetzt anmelden.</div>
    <div v-else style="color:var(--danger)">Token ungültig oder abgelaufen.</div>
    <div style="margin-top:12px;">
      <router-link data-umami-event="Email verifiziert -> Zurück zu Hausaufgaben" class="btn" to="/">Zurück zu Hausaufgaben</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import hw from '../hwApi';

const loading = ref(true);
const ok = ref(false);

onMounted(async () => {
  const params = new URLSearchParams(location.search);
  const token = params.get('token') || '';
  try {
    const { data } = await hw.get('/api/auth/verify', { params: { token } });
    ok.value = data.ok;
  } catch {
    ok.value = false;
  } finally {
    loading.value = false;
  }
});
</script>
