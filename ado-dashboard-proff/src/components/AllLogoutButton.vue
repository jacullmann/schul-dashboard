<template>
  <div>
    <button class="btn ghost" @click="openPopup">Dieses Gerät abmelden</button>

    <div v-if="showPopup" @click.self="closePopup" class="blurit">
      <div class="popup-card">
        <div class="row-n">
          <div class="header-icon-group">
            <TabletSmartphone class="modal-icon" size="28" />
            <h3 class="modal-title">Dieses Gerät abmelden</h3>
          </div>

          <p class="description-text">
            Wenn du fortfährst, wird das Gerät bzw. der Browser, in dem du dich gerade befindest, abgemeldet. Dadurch wird nicht dein spezieller Account ausgeloggt, sondern nur die allgemeine Authentifizierung der Klasse.
          </p>
        </div>

        <div class="popup-actions row">
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
import { useAppAuth } from '../composables/useAppAuth';
import { TabletSmartphone, LogOut } from "lucide-vue-next";
import { useRouter } from 'vue-router';

const router = useRouter();

const showPopup = ref(false)
const auth = useAppAuth();

function openPopup() {
  showPopup.value = true
}
async function doLogout() {
  await auth.logout();
  await router.push('/welcome');
}

function closePopup() {
  showPopup.value = false
}
</script>

<style scoped>

.popup-card {
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--lbg);
  box-shadow: var(--shadow-l);
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
  gap: 8px;
  text-align: left;
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
  text-align: left;
}

.popup-actions {
  flex-direction: row;
}

@media (max-width: 480px) {
  .popup-card {
    padding: 20px;
  }
}
</style>