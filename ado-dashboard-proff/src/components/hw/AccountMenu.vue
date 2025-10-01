<template>
  <div class="account-menu" ref="root">
    <button class="icon-btn" @click="toggle" :aria-expanded="open" :title="'Einstellungen'">
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></svg>
    </button>

    <transition name="pop">
      <div v-if="open" class="popup" @click.stop>
        <div class="popup-inner" role="menu" aria-label="Account menu">
          <div class="popup-top">
            <div class="user-info">
              <div class="user-email" :title="email">{{ email }}</div>
              <div class="user-sub">Account Einstellungen</div>
            </div>
            <button class="close-x" @click="close" aria-label="Close menu">✕</button>
          </div>

          <div class="popup-actions">
            <button class="action-btn" @click="goToProfile" title="Profil bearbeiten">
              <svg class="aicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"></path>
                <path d="M6.5 20a5.5 5.5 0 0 1 11 0"></path>
              </svg>
              Profil bearbeiten
            </button>

            <button class="action-btn" @click="startDelete" title="Account löschen">
              <svg class="aicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M3 6h18"></path>
                <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4h6v2"></path>
              </svg>
              Account löschen
            </button>
          </div>

          <div v-if="confirming" class="confirm">
            <div class="confirm-body">
              <div class="confirm-title">Account wirklich löschen?</div>
              <div class="confirm-text">E-Mail: <span class="confirm-email">{{ email }}</span></div>
              <div class="confirm-note">Diese Aktion löscht nur den Account-Datensatz. Andere Inhalte bleiben erhalten.</div>
            </div>

            <div class="confirm-actions">
              <button class="btn cancel" @click="confirming = false">Abbrechen</button>
              <button class="btn danger" @click="confirmDelete" :disabled="submitting">
                <span v-if="submitting">Lösche…</span>
                <span v-else>Löschen</span>
              </button>
            </div>
          </div>

          <div v-if="errorMsg" class="error-row">{{ errorMsg }}</div>
          <div v-if="successMsg" class="success-row">{{ successMsg }}</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import hw from '../../hwApi';

const props = defineProps<{ email: string }>();
const emit = defineEmits<{ (e: 'deleted'): void; (e: 'error', msg: string): void }>();

const open = ref(false);
const confirming = ref(false);
const submitting = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

function toggle() {
  open.value = !open.value;
  if (!open.value) confirming.value = false;
  clearMessages();
}
function close() {
  open.value = false;
  confirming.value = false;
  clearMessages();
}
function startDelete() {
  confirming.value = true;
  clearMessages();
}
function clearMessages() {
  errorMsg.value = '';
  successMsg.value = '';
}

async function confirmDelete() {
  submitting.value = true;
  errorMsg.value = '';
  try {
    const res = await hw.delete('/api/auth/me');
    if (res?.data?.ok) {
      successMsg.value = 'Account wurde gelöscht.';
      emit('deleted');
      // ensure UI reflects change
      setTimeout(() => { close(); }, 600);
    } else {
      const err = (res?.data?.error) || 'Unbekannter Fehler';
      errorMsg.value = err;
      emit('error', err);
    }
  } catch (e: any) {
    const msg = e?.response?.data?.error || 'Fehler beim Löschen';
    errorMsg.value = msg;
    emit('error', msg);
  } finally {
    submitting.value = false;
  }
}

function goToProfile() {
  // placeholder: emit event so parent can navigate if desired
  // left intentionally small and non-intrusive
  emit('error', 'Profil-Bearbeitung nicht implementiert');
}

// close on outside click or Escape
const root = ref<HTMLElement | null>(null);
function onDocClick(e: MouseEvent) {
  if (!root.value) return;
  if (!root.value.contains(e.target as Node)) {
    close();
  }
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
});
</script>

<style scoped>
.account-menu { position: relative; display: inline-block; margin-left: 10px; }

/* Icon button */
.icon-btn {
  width: 42px; height: 42px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  border: 1px solid rgba(255,255,255,0.06);
  color: var(--muted); cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease, color 150ms ease;
  backdrop-filter: blur(4px);
}
.icon-btn:hover { transform: translateY(-3px); color: var(--text); box-shadow: 0 8px 30px rgba(2,6,23,0.6); }

.icon { width:18px; height:18px; }

/* Popup */
.popup {
  position: fixed;
  right: 50%;
  top: 50%;
  z-index: 1400;
  width: min(360px, calc(100vw - 24px));
  display: flex;
  justify-content: flex-end;
  pointer-events: auto;
}

/* center-ish fallback for very narrow screens */
@media (max-width: 420px) {
  .popup { left: 12px; right: 12px; top: 12px; bottom: auto; width: calc(100vw - 24px); }
}


/* Glassmorphic inner card */
.popup-inner {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  -webkit-backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
  color: white;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 96px);
  overflow: auto;
}

/* Top row */
.popup-top {
  display:flex; align-items:center; justify-content:space-between;
}
.user-info { display:flex; flex-direction:column; gap:2px; overflow:hidden; }
.user-email { font-weight:700; font-size:13px; color:var(--primary); max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.user-sub { font-size:12px; color:var(--muted); }

.close-x {
  background: transparent; border: none; color: var(--muted); font-size:14px; cursor:pointer;
}

/* Actions */
.popup-actions { display:flex; flex-direction:column; gap:8px; margin-top:4px; }

.action-btn {
  display:flex; align-items:center; gap:10px;
  padding:10px 12px; border-radius:10px; background: rgba(255,255,255,0.02);
  border:1px solid rgba(255,255,255,0.04); color:var(--text); cursor:pointer;
  transition: transform 120ms ease, background 120ms ease;
}
.action-btn:hover { transform: translateY(-2px); background: rgba(255,255,255,0.03); }
.aicon { width:16px; height:16px; color:var(--muted); }

/* Confirm */
.confirm { margin-top:8px; padding-top:8px; border-top: 1px solid rgba(255,255,255,0.03); display:flex; flex-direction:column; gap:10px; }
.confirm-body { display:flex; flex-direction:column; gap:6px; }
.confirm-title { font-weight:700; color:var(--danger); }
.confirm-text { color:white; font-size:13px; }
.confirm-email { font-weight:700; color:var(--primary); }
.confirm-note { font-size:12px; color:white; }

.confirm-actions { display:flex; gap:8px; justify-content:flex-end; }
.btn {
  padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.06); background:transparent; color:white; cursor:pointer;
}
.btn.cancel { background: rgba(255,255,255,0.02); }
.btn.danger {
  background: linear-gradient(180deg,#ff6b6b,#ff3b3b); color:white; border:none; font-weight:700;
}
.btn:disabled { opacity:0.7; cursor:not-allowed; }

/* messages */
.error-row { color: #ffb3b3; font-size:13px; padding-top:6px; }
.success-row { color: #bff0c7; font-size:13px; padding-top:6px; }

/* pop animation */
.pop-enter-active, .pop-leave-active { transition: transform 180ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease; transform-origin: top right; }
.pop-enter-from { transform: translateY(-8px) scale(0.98); opacity: 0; }
.pop-enter-to { transform: translateY(0) scale(1); opacity: 1; }
.pop-leave-from { transform: translateY(0) scale(1); opacity: 1; }
.pop-leave-to { transform: translateY(-8px) scale(0.98); opacity: 0; }

/* Responsive */
@media (max-width: 420px) {
  .popup-inner { padding: 12px; }
}
</style>
