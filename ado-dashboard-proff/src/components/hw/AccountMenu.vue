<template>
  <div class="account-menu" ref="root">
    <button class="icon-btn" @click="toggle" :aria-expanded="open" :title="'Account-Menü'">
      <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3">
        <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/>
      </svg>
    </button>

    <transition name="pop">
      <div v-if="open" class="popup" :style="popupStyle" @click.stop>
        <div class="popup-inner" role="menu" aria-label="Account menu" ref="popupInner">
          <div class="user-section">
            <div class="user-email" :title="email">{{ email }}</div>
            <div class="user-sub">Eingeloggt</div>
          </div>

          <div class="menu-divider"></div>

          <div class="menu-actions">
            <button
                data-umami-event="Kurse bearbeiten Button"
                class="menu-btn"
                @click="openSetup"
            >
              <div class="menu-btn-content">
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#e3e3e3">
                  <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/>
                </svg>
                Kurse bearbeiten
              </div>
            </button>

            <button
                class="menu-btn"
                @click="handleLogout"
            >
              <div class="menu-btn-content">
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#e3e3e3">
                  <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/>
                </svg>
                Ausloggen
              </div>
            </button>
          </div>

          <div class="menu-divider"></div>

          <div class="danger-section">
            <button
                data-umami-event="Account löschen Button"
                class="menu-btn danger"
                @click="startDelete"
            >
              <div class="menu-btn-content">
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#f65252">
                  <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                </svg>
                Account löschen
              </div>
            </button>
          </div>


          <div v-if="confirming" class="confirm-section">
            <div class="confirm-warning">
              <strong>Account unwiderruflich löschen?</strong>
              <div class="confirm-text">E-Mail: {{ email }}</div>
              <div class="confirm-note">
                Wenn du deinen Account löschst, wird dieser mitsamt all deinen Einstellungen unwiderruflich entfernt. Allerdings bleiben hochgeladenen Einträge, Bilder oder Ankündigungen erhalten. Falls du diese ebenfalls entfernen willst, musst du diese manuell löschen, bevor dein Account geschlossen wird.

                Du kannst jederzeit einen neuen Account erstellen, aber vorherig hinzugefügte Inhalte sind dann nicht mehr mit deinem Account verknüpft, sodass du nicht mehr auf sie zugreifen kannst.

              </div>
              <label class="checkbox-label">
                <input
                    type="checkbox"
                    v-model="understoodChecked"
                    class="checkbox-input"
                >
                <span class="checkbox-custom"></span>
                Ich verstehe, dass ich hiermit meinen Account unwiderruflich lösche.
              </label>
            </div>

            <div class="confirm-actions">
              <button class="btn ghost small" @click="confirming = false">Abbrechen</button>
              <button
                  class="btn danger small"
                  @click="confirmDelete"
                  :disabled="submitting || !understoodChecked"
              >
                {{ submitting ? 'Löscht...' : 'Account Löschen' }}
              </button>
            </div>
          </div>

          <div v-if="errorMsg" class="message error">{{ errorMsg }}</div>
          <div v-if="successMsg" class="message success">{{ successMsg }}</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import hw from '../../hwApi';

const props = defineProps<{
  email: string;
  userData: any;
}>();

const emit = defineEmits<{
  (e: 'deleted'): void;
  (e: 'error', msg: string): void;
  (e: 'openSetup'): void;
  (e: 'logout'): void;
}>();

const open = ref(false);
const confirming = ref(false);
const submitting = ref(false);
const errorMsg = ref('');
const successMsg = ref('');
const understoodChecked = ref(false);

const root = ref<HTMLElement | null>(null);
const popupInner = ref<HTMLElement | null>(null);
const popupStyle = ref<Record<string, string>>({});

function handleLogout() {
  emit('logout');
  close();
}

function openSetup() {
  emit('openSetup');
  close();
}

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
  understoodChecked.value = false;
  clearMessages();
}

function clearMessages() {
  errorMsg.value = '';
  successMsg.value = '';
}

async function positionPopup() {
  await nextTick();
  const rootEl = root.value;
  const popupEl = popupInner.value;
  if (!rootEl || !popupEl) return;

  const iconBtn = rootEl.querySelector('.icon-btn') as HTMLElement | null;
  if (!iconBtn) return;

  const btnRect = iconBtn.getBoundingClientRect();
  const popupRect = popupEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (vw <= 480) {
    popupStyle.value = {
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      top: `${Math.max(64, btnRect.top + btnRect.height + 8)}px`,
      width: 'min(92vw, 300px)',
    };
    return;
  }

  let left = btnRect.left;
  let top = btnRect.top + btnRect.height + 8;

  // Prüfen ob das Popup über den rechten Rand hinausragt
  if (left + popupRect.width > vw - 8) {
    left = Math.max(8, vw - popupRect.width - 8);
  }

  // Prüfen ob das Popup über den unteren Rand hinausragt
  if (top + popupRect.height > vh - 8) {
    top = Math.max(8, btnRect.top - popupRect.height - 8);
  }

  popupStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.min(300, popupRect.width || 300)}px`,
  };
}

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
.account-menu {
  position: relative;
  display: inline-block;
}

/* Icon Button */
.icon-btn {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #aaaaaa;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f1f1;
}

.popup {
  z-index: 1400;
  position: fixed;
  pointer-events: auto;


}

.popup-inner {
  background: #282828;
  border: none;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 320px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* User Section */
.user-section {
  padding: 8px 4px;
}

.user-email {
  font-weight: 600;
  font-size: 14px;
  color: #f1f1f1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

/* Menu Actions */
.menu-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 6px 10px;
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-btn.danger {
  color: #f65252;
}

.menu-btn.danger:hover {
  background: rgba(246, 82, 82, 0.1);
}

.menu-btn-content {
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 1;
}

.menu-btn-content svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Divider */
.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 0;
}

/* Danger Section */
.danger-section {
  margin-top: 4px;
}

/* Confirm Section */
.confirm-section {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 12px;
  margin-top: 8px;
}

.confirm-warning {
  font-size: 13px;
  color: #f1f1f1;
  margin-bottom: 12px;
}

.confirm-warning strong {
  color: #f65252;
  display: block;
  margin-bottom: 6px;
}

.confirm-text {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
}

.confirm-note {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
  max-height: 110px ;
  overflow-y: scroll;
}

.confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn.small {
  padding: 6px 12px;
  font-size: 12px;
}

/* Messages */
.message {
  font-size: 12px;
  padding: 8px;
  border-radius: 4px;
  text-align: center;
}

.message.error {
  background: rgba(246, 82, 82, 0.1);
  color: #f65252;
}

.message.success {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.pop-enter-active, .pop-leave-active {
  transition: transform 120ms cubic-bezier(.2,.9,.2,1), opacity 120ms ease;
  transform-origin: top left; /* Von top-left statt top-right */
}

.pop-enter-from {
  transform: translateY(-8px) scale(0.98);
  opacity: 0;
}

.pop-enter-to {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.pop-leave-from {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.pop-leave-to {
  transform: translateY(-8px) scale(0.98);
  opacity: 0;
}

/* Für mobile Ansicht weiterhin zentriert */


.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--muted);
  cursor: pointer;
  margin-top: 8px;
  padding: 4px 0;
}

.checkbox-input {
  display: none;
}

.checkbox-custom {
  width: 16px;
  height: 16px;
  border: 1px solid #666;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.checkbox-input:checked + .checkbox-custom {
  background: var(--primary);
  border-color: var(--primary);
}

.checkbox-input:checked + .checkbox-custom::after {
  content: '✓';
  color: white;
  font-size: 12px;
}

.checkbox-label:hover .checkbox-custom {
  border-color: #888;
}

/* Responsive */
@media (max-width: 480px) {
  .popup {
    top: 20% !important;
    width: calc(100vw - 24px) !important;
  }

  .popup-inner {
    padding: 10px;
  }
}
@media (max-width: 480px) {
  .pop-enter-active, .pop-leave-active {
    transform-origin: top center;
  }
}
</style>