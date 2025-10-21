<template>
  <div>
    <button class="btn ghost" @click="openPopup">Dieses Gerät abmelden</button>

    <div v-if="showPopup" @click="closePopup" class="popup-overlay">
      <div class="popup">
        <p>Dieses Gerät abmelden</p>
        <div class="popup-content">
        <button class="btn ma" @click="doLogout">Abmelden</button>
        <button class="btn ghost ma" @click="closePopup">Abbrechen</button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth';

const showPopup = ref(false)
const auth = useAuth();

function openPopup() {
  showPopup.value = true
}
function doLogout() {
  auth.logout();
  window.location.href ='https://schul-dashboards.onrender.com'
}

function closePopup() {
  showPopup.value = false
}
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
}

.popup {
  border-radius: 14px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  -webkit-backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
  padding: 1.2rem;
  min-width: 200px;
  text-align: center;
  color: var(--text);
  z-index: 6000;
}
.ma {
  margin: 0.3rem;
}
</style>
