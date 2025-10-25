<template>
  <div class="notfound-wrap">
    <h1 class="title">404</h1>
    <p class="subtitle">Seite nicht gefunden</p>
    <div class="actions">
      <button data-umami-event="404 zur Startseite Button" class="btn" @click="goHome">Zur Startseite</button>
      <button data-umami-event="404 zurück Button" class="btn ghost" @click="goBack">Zurück</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();

function goHome() {
  router.push('/');
}
function goBack() {
  window.history.length > 1 ? window.history.back() : (router.push('/'));
}
</script>

<style scoped>
.notfound-wrap {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10vh;
}

.title {
  font-size: clamp(84px, 18vw, 190px);
  font-weight: 900;
  margin: 0;
  color: transparent;
  background: rgba(255, 255, 255, 0.72);
  text-shadow: 0 8px 32px rgba(0, 0, 0, 0.07);
  background-clip: text;
  letter-spacing: 2px;
}

.subtitle {
  font-size: clamp(25px, 4vw, 32px);
  color: transparent;
  background: rgba(255, 255, 255, 0.90);
  text-shadow: 0 8px 32px rgba(0, 0, 0, 0.02);
  background-clip: text;
  margin: 12px 0 32px 0;
}

.actions {
  display: flex;
  gap: 16px;
}

.btn {
  padding: 12px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 16px;
  color: white;
  transition: background 0.2s ease, transform 0.2s ease;
  background: rgba(255, 255, 255, 0.19);
  backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  -webkit-backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.32);
}

.btn:hover {
  background: rgba(255, 255, 255, 0.31);
}

</style>
