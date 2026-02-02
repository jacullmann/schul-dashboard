<template>
  <div>
    <button style="margin: 0;" class="btn ghost" @click="openPopup">Dieses Gerät abmelden</button>

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
          <button class="btn ghost" @click="closePopup" :disabled="loggingOut">
            Abbrechen
          </button>
          <button class="btn ghost" @click="doLogout" :disabled="loggingOut">
            <LoadingSpinner v-if="loggingOut" size="1em" />
            <template v-else>
              <LogOut size="16" />
              Abmelden
            </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useAppAuth } from '../composables/useAppAuth';
import { TabletSmartphone, LogOut } from "lucide-vue-next";
import { useRouter } from 'vue-router';
import LoadingSpinner from './LoadingSpinner.vue';

const router = useRouter();

const showPopup = ref(false)
const loggingOut = ref(false)
const auth = useAppAuth();

function openPopup() {
  showPopup.value = true
}

async function doLogout() {
  loggingOut.value = true
  try {
    await auth.logout();
    await router.push('/welcome');
  } finally {
    loggingOut.value = false
  }
}

function closePopup() {
  if (!loggingOut.value) {
    showPopup.value = false
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showPopup.value && !loggingOut.value) {
    closePopup()
  }
}

watch(showPopup, (newVal) => {
  if (newVal) {
    window.addEventListener('keydown', onKeyDown)
  } else {
    window.removeEventListener('keydown', onKeyDown)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
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
  margin: 0;
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