<template>
  <div class="card">
    <h2 style="margin-top:0;">E-Mail bestätigen</h2>
    <div v-if="loading" class="row" style="align-items:center; gap:8px;">
      <div class="spinner" style="width:20px;height:20px;border-width:2px;"></div>
      <div>Prüfe Token...</div>
    </div>
    <div v-else-if="ok" style="color:var(--primary)">Erfolg! Du kannst dich jetzt anmelden.</div>
    <div v-else style="color:var(--danger)">Token ungültig oder abgelaufen.</div>
    <div style="margin-top:12px;">
      <router-link class="btn" to="/hausaufgaben">Zurück zu Hausaufgaben</router-link>
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
    ok.value = !!data?.ok;
  } catch {
    ok.value = false;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.spinner {
  width:20px; height:20px;
  border:2px solid #2a364e; border-top-color: var(--primary);
  border-radius:50%; animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
