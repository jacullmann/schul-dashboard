<template>
  <div class="account-menu" ref="root">
    <button class="icon-btn" @click="toggle" :aria-expanded="open" :title="'Einstellungen'">
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></svg>
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
import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import hw from '../../hwApi';

const props = defineProps<{ email: string }>();
const emit = defineEmits<{ (e: 'deleted'): void; (e: 'error', msg: string): void }>();

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
  color: var(--muted); cursor: pointer;
  transition: transform 0.18s ease-in-out;
  display: inline-flex;
}
.icon-btn:hover { color: var(--text); transform: rotate(12deg); }

/* Popup wrapper (positioned via inline style popupStyle) */
.popup {
  z-index: 1400;
  pointer-events: auto;
  max-width: 600px;
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
