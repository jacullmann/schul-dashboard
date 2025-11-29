<template>
  <div v-if="visible" class="cookie-banner">
    <div class="cookie-content">
      <div class="cookie-text">
        <p>Diese Seite verwendet das datenschutzfreundliche und cookie-freie Analyse-Tool Umami, um die Nutzung der Seite zu analysieren. Dabei werden die Daten anonym gespeichert, sodass eine genaue Zuordnung zu bestimmten Besuchern nicht möglich ist. Die Analyse hilft uns, damit wir uns stetig verbessern können. Lies unsere <a @click="toData" class="data-link" style="cursor: pointer">Datenschutzerklärung</a> für weitere Details.</p>
      </div>

      <div class="cookie-actions">
        <button data-umami-event="Cookies ablehnen" class="btn btn-ghost" @click="revoke">Ablehnen</button>
        <button data-umami-event="Cookies akzepieren" class="btn btn-primary" @click="accept">Verstanden</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useRouter } from 'vue-router';

const auth = useAuth();
const visible = ref(false);
const router = useRouter();

function accept() {
  const payload = { accepted: true, expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() };
  localStorage.setItem('cookie_consent', JSON.stringify(payload));
  visible.value = false;
}
function toData(){
  router.push('/impressum-&-datenschutz/datenschutzerklaerung');
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
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
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
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
}
.cookie-text p {
  margin: 0;
}

.data-link {
  color: var(--text);
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.3);
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
}

.data-link:hover {
  color: #fff;
  text-decoration-color: #fff;
}

.cookie-actions {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 14px;
}

.btn-ghost {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-primary {
  background: #f1f1f1;
  color: var(--bg);
  border: 1px solid #f1f1f1;
}
.btn-primary:hover {
  background: #fff;
  border-color: #fff;
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
}

@media (max-width: 500px) {
  .cookie-banner {
    bottom: 0;
    left: 0;
    right: 0;
    max-width: 100%;
    border-radius: 0;
    box-shadow: 0 -4px 15px rgba(0,0,0,0.3);
  }

  .cookie-actions {
    flex-direction: column;
    justify-content: center;
    gap: 12px;
  }
  .btn {
    width: 100%;
  }
}
</style>