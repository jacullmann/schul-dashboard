<template>
  <div class="account-menu" ref="root">
    <button class="icon-btn" @click="toggle" :aria-expanded="open" :title="'Einstellungen'">
      <svg color="white" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#e3e3e3"><g><path d="M0,0h24v24H0V0z" fill="none"/><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></g></svg>
    </button>

    <transition name="pop">
      <div v-if="open" class="popup" :style="popupStyle" @click.stop>
        <div class="popup-inner card" role="menu" aria-label="Account menu" ref="popupInner">
          <div class="popup-top">
            <div class="user-info">
              <div data-umami-event="Account Einstellungen Button" class="user-sub" >Account Einstellungen</div>
              <div class="user-email" :title="email">{{ email }}</div>
            </div>
            <button class="close-x" @click="close" aria-label="Close menu">✕</button>
          </div>

          <div class="popup-actions">
            <button data-umami-event="Profil bearbeiten Button" class="action-btn" @click="goToProfile" title="Profil bearbeiten">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z"/></svg>
              Profil bearbeiten
            </button>
            <button
                data-umami-event="Kurse bearbeiten Button"
                class="action-btn"
                @click="openSetup"
                title="Kurse bearbeiten"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/>
              </svg>
              Kurse bearbeiten
            </button>

            <button data-umami-event="Account löschen Button" class="action-btn" @click="startDelete" title="Account löschen">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
              Account löschen
            </button>
          </div>

          <div v-if="confirming" class="confirm">
            <div class="confirm-body">
              <div class="confirm-title">Account unwiderruflich löschen?</div>
              <div class="confirm-text">E-Mail: <span class="confirm-email">{{ email }}</span></div>
              <div class="confirm-note">Wenn du deinen Account löschst, wird dieser mitsamt all deinen Einstellungen unwiderruflich entfernt. Allerdings bleiben hochgeladenen Einträge, Bilder oder Ankündigungen erhalten. Falls du diese ebenfalls entfernen willst, musst du diese manuell löschen, bevor dein Account geschlossen wird.

                Du kannst jederzeit einen neuen Account erstellen, aber vorherig hinzugefügte Inhalte sind dann nicht mehr mit deinem Account verknüpft, sodass du nicht mehr auf sie zugreifen kannst.
              </div>
            </div>

            <div class="confirm-actions">
              <button data-umami-event="Account löschen abbrechen Button" class="btn cancel" @click="confirming = false">Abbrechen</button>
              <button data-umami-event="Account endgültig löschen" class="btn danger" @click="confirmDelete" :disabled="submitting">
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
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import hw from '../../hwApi';

// KORREKTUR: Nur EINE defineProps und defineEmits Definition
const props = defineProps<{
  email: string;
  userData: any;
}>();

const emit = defineEmits<{
  (e: 'deleted'): void;
  (e: 'error', msg: string): void;
  (e: 'openSetup'): void;
}>();

const open = ref(false);
const confirming = ref(false);
const submitting = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// refs to measure & place popup
const root = ref<HTMLElement | null>(null);
const popupInner = ref<HTMLElement | null>(null);

// reactive style for popup placement
const popupStyle = ref<Record<string, string>>({});

function openSetup() {
  emit('openSetup');
  close(); // Schließt das Menü nach Klick
}

// toggle / close
function toggle() {
  open.value = !open.value;
  if (open.value) positionPopup();
  else confirming.value = false;
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

async function positionPopup() {
  // wait DOM update
  await nextTick();
  const rootEl = root.value;
  const popupEl = popupInner.value;
  if (!rootEl || !popupEl) return;

  const iconBtn = rootEl.querySelector('.icon-btn') as HTMLElement | null;
  if (!iconBtn) return;

  const btnRect = iconBtn.getBoundingClientRect();
  const popupRect = popupEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const breakpoint = 480; // small screens fallback

  // on small screens center the popup (makes it look like a modal/dropdown centered)
  if (vw <= breakpoint) {
    popupStyle.value = {
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%) translateY(0)',
      top: `${Math.max(64, btnRect.top + btnRect.height + 8)}px`,
      width: `min(92vw, 360px)`,
      right: 'auto'
    };
    return;
  }

  // Desktop: try to place directly below the icon, prefer aligning right edge of popup with right edge of icon
  const spaceRight = vw - btnRect.left;
  const preferLeft = btnRect.left + btnRect.width / 2 > vw / 2 ? true : false;

  // compute left such that popup fits in viewport
  let left = btnRect.left + btnRect.width - popupRect.width; // align right edges
  if (left < 8) left = 8;
  if (left + popupRect.width > vw - 8) left = Math.max(8, vw - popupRect.width - 8);

  // top sits below button
  const top = btnRect.top + btnRect.height + 8;

  popupStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    transform: 'translateY(0)',
    width: `${Math.min(360, popupRect.width || 360)}px`,
  };
}

// delete confirm flow
async function confirmDelete() {
  submitting.value = true;
  errorMsg.value = '';
  try {
    const res = await hw.delete('/api/auth/me');
    if (res?.data?.ok) {
      successMsg.value = 'Account wurde gelöscht.';
      emit('deleted');
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
  emit('error', 'Dein Browser unterstützt dieses Feature nicht.');
}

// close on outside click or Escape
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
  window.addEventListener('resize', () => {
    if (open.value) positionPopup();
  });
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
  align-items: center; justify-content: center;
  background: transparent;
  border: none;
  color: #aaaaaa;
  cursor: pointer;
  transition: 0.2s ease-in-out;
  display: inline-flex;
}
.icon-btn:hover {
  color:#f1f1f1;
  background: rgba(255, 255, 255, 0.1) ;
}

.setting-icon {
  color: #aaaaaa;
}
.setting-icon:hover {
  color: #f1f1f1;
}

/* Popup wrapper (positioned via inline style popupStyle) */
.popup {
  z-index: 1400;
  pointer-events: auto;
  min-width: 400px;
}

/* inner card styling unchanged */
.popup-inner {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  -webkit-backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
  color: var(--text);
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
.user-email { font-weight:700; font-size:12px; color:var(--sub); max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.user-sub {
  font-size: 18px;
  font-weight: 600;
  color:var(--text);
}

.close-x {
  background: transparent; border: none; color: var(--text); font-size:14px; cursor:pointer;
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
.aicon { width:16px; height:16px; color:var(--text); }

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

/* Responsive fallback for very small screens: make popup centered and full-ish */
@media (max-width: 480px) {
  .popup { top: 20% !important; width: calc(100vw - 24px) !important; }
  .popup-inner { padding: 12px; }
}
</style>
