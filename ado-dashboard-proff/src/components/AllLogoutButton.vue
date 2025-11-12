<template>
  <div>
    <button class="btn ghost" @click="openPopup">Dieses Gerät abmelden</button>

    <div v-if="showPopup" @click="closePopup" class="popup-overlay">
      <div class="popup">
        <div class="secure-icon">
          <TabletSmartphone />
          <h3>Dieses Gerät abmelden</h3>
        </div>
        <p class="small">Wenn du fortfährst, wird das Gerät bzw. der Browser, in dem du dich gerade befindest, abgemeldet. Dadurch wird nicht dein spezieller Account ausgeloggt, sondern nur die allgemeine Authentifizierung der Klasse.</p>
        <div class="popup-content">
        <button class="btn mas ma" @click="doLogout"><LogOut size="14px"/>Abmelden</button>
        <button class="btn ghost ma" @click="closePopup">Abbrechen</button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth';
import { TabletSmartphone, LogOut } from "lucide-vue-next";

const showPopup = ref(false)
const auth = useAuth();

function openPopup() {
  showPopup.value = true
}
function doLogout() {
  auth.logout();
  window.location.replace('https://schul-dashboards.onrender.com')
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

.popup-content {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

}

.popup {
  border-radius: 14px;
  border: none;
  background: var(--card);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
  padding: 1.2rem;
  min-width: 200px;
  text-align: center;
  color: var(--text);
  z-index: 6000;
  max-width: 400px;
  margin: 1rem;
}
.ma {
  margin: 0.3rem;
}
.small {
  font-size: 0.75rem;
  word-break: normal;
}

.secure-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

}
.mas {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;


}
</style>
