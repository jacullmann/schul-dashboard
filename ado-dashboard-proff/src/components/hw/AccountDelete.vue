<template>
  <div class="account-settings">
    <button class="btn icon-btn" @click="toggle" aria-haspopup="true" :aria-expanded="open.toString()" title="Einstellungen">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" fill="currentColor"/>
        <path d="M19.4 15a1 1 0 0 0 .1 1.1l.9.9a1 1 0 0 1-1.4 1.4l-.9-.9a1 1 0 0 0-1.1-.1 6.6 6.6 0 0 1-1.6.9 1 1 0 0 0-.6 1v1.2a1 1 0 0 1-2 0V18a1 1 0 0 0-.6-1 6.6 6.6 0 0 1-1.6-.9 1 1 0 0 0-1.1.1l-.9.9A1 1 0 0 1 5 17.9l.9-.9a1 1 0 0 0 .1-1.1 6.6 6.6 0 0 1-.9-1.6 1 1 0 0 0-1-.6H3.9a1 1 0 0 1 0-2H5a1 1 0 0 0 1-.6c.2-.6.5-1.2.9-1.6a1 1 0 0 0-.1-1.1l-.9-.9A1 1 0 0 1 6.1 5.1l.9.9c.3.3.8.3 1.1.1.4-.3 1-.6 1.6-.9A1 1 0 0 0 10 5V3.9a1 1 0 0 1 2 0V5a1 1 0 0 0 .6 1c.6.2 1.2.5 1.6.9.3.3.8.3 1.1.1l.9-.9A1 1 0 0 1 18.9 6.1l-.9.9c-.3.3-.3.8-.1 1.1.3.4.6 1 .9 1.6a1 1 0 0 0 1 .6h1.2a1 1 0 0 1 0 2H20a1 1 0 0 0-1 .6c-.2.6-.5 1.2-.9 1.6z" fill="currentColor" opacity="0.9"/>
      </svg>
    </button>

    <!-- Dropdown pop-up -->
    <div v-if="open" class="popup" ref="popup" @click.outside="closeWithDelay">
      <div class="popup-card glass">
        <button class="btn danger wide" @click="startDelete" :disabled="deleting">
          Account löschen
        </button>
      </div>
    </div>

    <!-- Confirm modal -->
    <div v-if="confirming" class="overlay-confirm" role="dialog" aria-modal="true" aria-label="Account löschen bestätigen">
      <div class="confirm-card glass">
        <h4>Account wirklich löschen?</h4>
        <p class="small">Account E-Mail: <strong>{{ email }}</strong></p>
        <p class="small">Dies löscht ausschließlich deinen Benutzeraccount. Beiträge und Bilder bleiben erhalten.</p>
        <div class="row" style="justify-content:center; gap:12px; margin-top:16px;">
          <button class="btn danger" @click="confirmDelete" :disabled="deleting">
            Ja, Account löschen
          </button>
          <button class="btn ghost" @click="cancelConfirm" :disabled="deleting">Abbrechen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import hw from '../hwApi';

const props = defineProps<{ email: string }>();
const emit = defineEmits<{ (e: 'deleted'): void }>();

const open = ref(false);
const confirming = ref(false);
const deleting = ref(false);
const popup = ref<HTMLElement | null>(null);

// click outside directive emulation
function onDocumentClick(e: MouseEvent) {
  if (!popup.value) return;
  if (!popup.value.contains(e.target as Node)) {
    open.value = false;
  }
}
onMounted(() => document.addEventListener('click', onDocumentClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick));

function toggle() {
  open.value = !open.value;
  if (open.value) confirming.value = false;
}

function closeWithDelay() {
  // keep small delay so clicking inside popup works; already handled by event propagation
  setTimeout(() => { open.value = false; }, 150);
}

function startDelete() {
  open.value = false;
  confirming.value = true;
}

function cancelConfirm() {
  confirming.value = false;
}

async function confirmDelete() {
  deleting.value = true;
  try {
    await hw.delete('/api/auth/me');
    // inform parent that account was deleted so it can clear UI and token
    emit('deleted');
  } catch (e: any) {
    // Show error to user in console and with a browser alert for now
    console.error('delete account error', e);
    alert(e?.response?.data?.error || 'Fehler beim Löschen des Accounts.');
  } finally {
    deleting.value = false;
  }
}
</script>

<style scoped>
.account-settings { display:inline-flex; align-items:center; position:relative; }

/* icon button next to logout */
.icon-btn {
  width: 42px;
  height: 36px;
  padding: 8px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.06);
  color: var(--text);
}

/* popup card styled as glassmorphism */
.popup {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 220;
  display: flex;
  justify-content: flex-end;
  width: 220px;
}
.popup-card {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(12px) saturate(105%);
  -webkit-backdrop-filter: blur(12px) saturate(105%);
  box-shadow: 0 10px 30px rgba(0,0,0,0.45);
  display:flex;
  justify-content:center;
  align-items:center;
}

/* confirm overlay frozen glass */
.overlay-confirm {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  background: rgba(0,0,0,0.45);
}
.confirm-card {
  width: 100%;
  max-width: 420px;
  padding: 18px;
  border-radius: 14px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(18px) saturate(110%);
  -webkit-backdrop-filter: blur(18px) saturate(110%);
  box-shadow: 0 12px 40px rgba(0,0,0,0.55);
  color: var(--text);
}

/* button helpers */
.btn.wide { width: 100%; display:inline-flex; justify-content:center; }
.small { font-size: 13px; color: var(--muted); margin: 8px 0 0; }
</style>
