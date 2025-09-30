<template>
  <div class="account-delete" ref="root">
    <button
        v-if="user"
        class="btn ghost settings-btn"
        @click.stop="toggle()"
        :aria-expanded="open ? 'true' : 'false'"
        aria-label="Account Einstellungen"
        title="Einstellungen"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2.3 16.88l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.7 0 1.29-.4 1.51-1a1.65 1.65 0 0 0-.33-1.82L4.3 2.3A2 2 0 0 1 7.13.47l.06.06c.5.5 1.2.66 1.82.33.6-.32 1-.9 1-1.51V0a2 2 0 0 1 4 0v.09c0 .61.4 1.19 1 1.51.62.33 1.32.17 1.82-.33l.06-.06A2 2 0 0 1 21.7 4.3l-.06.06c-.5.5-.66 1.2-.33 1.82.32.61.9 1 1.51 1H21a2 2 0 0 1 0 4h-.09c-.61 0-1.19.4-1.51 1z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <transition name="fade-scale">
      <div v-if="open" class="popup" ref="popup" @click.stop>
        <div class="popup-inner">
          <div class="popup-header">
            <div class="title">Account Einstellungen</div>
          </div>

          <div class="popup-body">
            <button class="btn danger full" @click="startDelete">Account löschen</button>
          </div>

          <div class="popup-footer small muted">Admins können ihren Account nicht löschen</div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="confirmVisible" class="confirm-backdrop" @click.self="cancelDelete">
        <div class="confirm" @click.stop>
          <h4>Account wirklich löschen</h4>
          <div class="confirm-text">
            Du bist eingeloggt als <strong>{{ user?.email }}</strong>. Wenn du fortfährst, wird dein Account dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
          </div>

          <div class="confirm-actions">
            <button class="btn" @click="cancelDelete">Abbrechen</button>
            <button class="btn danger" :disabled="processing" @click="confirmDelete">
              {{ processing ? 'Lösche...' : 'Account löschen' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

// EINZIGER defineProps Aufruf
const props = defineProps<{ user: any }>();
const emit = defineEmits<{
  (e: 'deleted'): void;
}>();

const open = ref(false);
const confirmVisible = ref(false);
const popup = ref<HTMLElement | null>(null);
const root = ref<HTMLElement | null>(null);
const processing = ref(false);
const router = useRouter();

function toggle() {
  open.value = !open.value;
  if (!open.value) confirmVisible.value = false;
}

function startDelete() {
  if (props.user?.isAdmin) {
    open.value = false;
    return alert('Admins können ihren Account nicht löschen.');
  }
  confirmVisible.value = true;
}

function cancelDelete() {
  confirmVisible.value = false;
}

async function confirmDelete() {
  if (!props.user) return;
  processing.value = true;
  try {
    await axios.delete('/api/account', { headers: { Authorization: getAuthHeader() } });
    clearAuthToken();
    emit('deleted');
    try { router.push('/'); } catch {}
  } catch (err: any) {
    console.error('Account delete failed', err);
    alert(err?.response?.data?.error || 'Fehler beim Löschen des Accounts.');
  } finally {
    processing.value = false;
    confirmVisible.value = false;
    open.value = false;
  }
}

function getAuthHeader() {
  return localStorage.getItem('hw_token') ? `Bearer ${localStorage.getItem('hw_token')}` : '';
}
function clearAuthToken() {
  localStorage.removeItem('hw_token');
}

function onDocClick(e: MouseEvent) {
  if (!open.value) return;
  const p = popup.value;
  const r = root.value;
  if (!p) { open.value = false; return; }
  if (r && !r.contains(e.target as Node)) open.value = false;
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
});
</script>

<style scoped>
.fade-scale-enter-active, .fade-scale-leave-active { transition: all 180ms ease; }
.fade-scale-enter-from { opacity: 0; transform: translateY(-6px) scale(.98); }
.fade-scale-enter-to { opacity: 1; transform: translateY(0) scale(1); }
.fade-scale-leave-from { opacity: 1; transform: translateY(0) scale(1); }
.fade-scale-leave-to { opacity: 0; transform: translateY(-6px) scale(.98); }

.fade-enter-active, .fade-leave-active { transition: opacity 160ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-to, .fade-leave-from { opacity: 1; }

.account-delete { display: inline-flex; align-items: center; position: relative; }

.settings-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 34px;
  padding: 6px;
  border-radius: 8px;
  color: var(--muted);
  background: transparent;
  transition: background 120ms ease, color 120ms ease;
}
.settings-btn:hover { background: rgba(255,255,255,0.02); color: var(--text); cursor: pointer; }

.popup {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1200;
  pointer-events: auto;
}

.popup-inner {
  min-width: 220px;
  max-width: 320px;
  border-radius: 12px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 8px 30px rgba(2,6,23,0.45);
  color: var(--text);
}

.popup-header .title { font-weight: 700; margin-bottom: 8px; }
.popup-body { display:flex; gap:8px; flex-direction:column; }
.full { width: 100%; }

.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2,6,23,0.45);
  backdrop-filter: blur(4px);
}

.confirm {
  width: min(720px, 92%);
  max-width: 520px;
  background: linear-gradient(180deg, rgba(17,17,19,0.9), rgba(9,9,11,0.86));
  border-radius: 12px;
  padding: 18px;
  color: var(--text);
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow: 0 12px 40px rgba(2,6,23,0.6);
}
.confirm h4 { margin:0 0 10px 0; font-size:1.05rem; }
.confirm-text { margin-bottom: 14px; color: var(--muted); }
.confirm-actions { display:flex; gap:10px; justify-content:flex-end; }

.small.muted { margin-top:8px; color: var(--muted); font-size:12px; }
</style>
