<template>
  <div>
    <button class="btn ghost" @click="openPopup">Dieses Gerät abmelden</button>

    <div v-if="showPopup" @click.self="closePopup" class="blurit">
      <div class="popup-card">

        <div class="header-icon-group">
          <TabletSmartphone class="modal-icon" size="28" />
          <h3 class="modal-title">Dieses Gerät abmelden</h3>
        </div>

        <p class="description-text">
          Wenn du fortfährst, wird das Gerät bzw. der Browser, in dem du dich gerade befindest, abgemeldet. Dadurch wird nicht dein spezieller Account ausgeloggt, sondern nur die allgemeine Authentifizierung der Klasse.
        </p>

        <div class="popup-actions">
          <button class="btn ghost" @click="doLogout">
            <LogOut size="16" />
            Abmelden
          </button>

          <button class="btn ghost" @click="closePopup">
            Abbrechen
          </button>
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
  window.location.replace('https://schul-dashboard.com')
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
  background: var(--lbg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
}

.popup-card {
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--lbg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  padding: 24px;
  min-width: 280px;
  max-width: 420px;
  text-align: center;
  color: var(--text);
  z-index: 6000;
  margin: 16px;
}

.header-icon-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 16px;
  justify-content: center;
  gap: 8px;
}
.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.description-text {
  font-size: 13px;
  color: var(--sub);
  line-height: 1.5;
  margin-bottom: 20px;
}

.popup-actions {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 12px;
}

@media (max-width: 480px) {
  .popup-card {
    padding: 20px;
  }
  .popup-actions {
    flex-direction: column;
  }
}
</style>