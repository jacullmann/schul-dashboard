<template>
  <div class="account-menu" ref="root">
    <div class="icon-btn" @click="toggle" :aria-expanded="open" :title="'Account-Menü'">
      <div class="avatar-circle" :style="{ backgroundColor: avatarColor }">
        {{ avatarLetter }}
      </div>
    </div>

    <transition name="pop">
      <div v-if="open" class="popup" :style="popupStyle" @click.stop>
        <div class="popup-inner" role="menu" aria-label="Account menu" ref="popupInner">
          <div class="menu-actions">
            <div class="user-section">
              <div class="user-email" :title="email">{{ email }}</div>
            </div>
            <div class="menu-divider"></div>

            <button
                ref="firstMenuBtnRef"
                class="menu-btn"
                @click="openSetup"
            >
              <div class="menu-btn-content">
                <LucideGraduationCap :size="16"/>
                Kurse bearbeiten
              </div>
            </button>

            <PersonalizationDropdown
                v-model="personalizationSetting"
                @change="onPersonalizationChange"
            />
            <div class="menu-divider"></div>
            <button
                data-umami-event="Sicherheit Button"
                class="menu-btn"
                @click="openSecurity"
            >
              <div class="menu-btn-content">
                <ShieldCheck :size="16"/>
                Sicherheit
              </div>
            </button>

            <button
                data-umami-event="Passwort ändern Button"
                class="menu-btn"
                @click="openChangePassword"
            >
              <div class="menu-btn-content">
                <LucideKeyRound :size="16"/>
                Passwort ändern
              </div>
            </button>

            <button
                class="menu-btn"
                @click="handleLogout"
            >
              <div class="menu-btn-content">
                <LogOut :size="16"/>
                Abmelden
              </div>
            </button>
            <div class="menu-divider"></div>
            <div class="danger-section">
              <button
                  data-umami-event="Account löschen Button"
                  class="menu-btn danger"
                  @click="startDelete"
              >
                <div class="menu-btn-content">
                  <Trash2 :size="16"/>
                  Konto löschen
                </div>
              </button>
            </div>
          </div>

          <div v-if="errorMsg" class="message error">{{ errorMsg }}</div>
          <div v-if="successMsg" class="message success">{{ successMsg }}</div>
        </div>
      </div>
    </transition>

    <!-- Passwort ändern Modal -->
    <ChangePasswordModal
        v-if="showChangePassword"
        @close="showChangePassword = false"
        @success="onPasswordChanged"
    />
    <!-- Sicherheits-Modal -->
    <SecurityModal
        v-if="showSecurity"
        :initial-mfa-enabled="userData?.mfaEnabled"
        @cancel="showSecurity = false"
        @mfa-changed="onMfaChanged"
    />
    <!-- Account löschen Modal -->
    <DeleteAccountModal
        v-if="showDeleteAccount"
        :email="email"
        @close="showDeleteAccount = false"
        @deleted="onAccountDeleted"
        @error="onDeleteError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount, computed } from 'vue';
import { Trash2, LogOut, LucideGraduationCap, LucideKeyRound, ShieldCheck } from "lucide-vue-next";
import ChangePasswordModal from './ChangePasswordModal.vue';
import DeleteAccountModal from './DeleteAccountModal.vue';
import PersonalizationDropdown from './PersonalizationDropdown.vue';
import SecurityModal from './SecurityModal.vue';

const props = defineProps<{
  email: string;
  userData: any;
}>();

const emit = defineEmits<{
  (e: 'deleted'): void;
  (e: 'error', msg: string): void;
  (e: 'openSetup'): void;
  (e: 'logout'): void;
  (e: 'personalizationChanged', value: boolean): void;
  (e: 'mfaChanged', value: boolean): void;
}>();

// Liste der 11 Google Farben
const AVATAR_COLORS = [
  '#AA47BD',
  '#7B1FA2',
  '#77919D',
  '#455A65',
  '#EC417A',
  '#C1175C',
  '#0388D2',
  '#0098A7',
  '#004D40',
  '#EF6C00',
  '#F6511E',
];

function getColorIndexFromEmail(email: string): number {
  if (!email || email.length < 2) {
    return 0; // wenn email sehr kurz ist
  }

  const secondChar = email[1];

  const charCode = secondChar.charCodeAt(0);

  return charCode % AVATAR_COLORS.length;
}

// hilfsfunktion für buchstaben zurückgeben
const avatarLetter = computed(() => {
  return props.email && props.email.length > 0
      ? props.email[0].toUpperCase()
      : '?';
});

// deterministische farbe zurückgeben
const avatarColor = computed(() => {
  const index = getColorIndexFromEmail(props.email);
  return AVATAR_COLORS[index];
});

const personalizationSetting = computed({
  get: () => props.userData?.personalized ?? true,
  set: () => {}
});

function onPersonalizationChange(value: boolean) {
  emit('personalizationChanged', value);
}

const open = ref(false);
const errorMsg = ref('');
const successMsg = ref('');
const showChangePassword = ref(false);
const showDeleteAccount = ref(false);
const showSecurity = ref(false);

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

function openChangePassword() {
  showChangePassword.value = true;
  close();
}

function openSecurity() {
  showSecurity.value = true;
  close();
}

function onMfaChanged(enabled: boolean) {
  emit('mfaChanged', enabled);
}

function onPasswordChanged() {
  successMsg.value = 'Passwort erfolgreich geändert!';
  setTimeout(() => {
    successMsg.value = '';
  }, 3000);
}

const firstMenuBtnRef = ref<HTMLButtonElement | null>(null);

async function toggle() {
  open.value = !open.value;
  if (open.value) {
    await positionPopup();
    await nextTick();
    firstMenuBtnRef.value?.focus();
  }
  clearMessages();
}

function close() {
  open.value = false;
  clearMessages();
}

function startDelete() {
  showDeleteAccount.value = true;
  close();
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

  if (left + popupRect.width > vw - 8) {
    left = Math.max(8, vw - popupRect.width - 8);
  }

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

function onAccountDeleted() {
  emit('deleted');
}

function onDeleteError(msg: string) {
  emit('error', msg);
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
  height: 32px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text);
  cursor: pointer;
}

.avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  color: #fff;
  user-select: none;
}

.popup {
  z-index: 1400;
  position: fixed;
  pointer-events: auto;
}

.popup-inner {
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 12px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 320px;
  box-shadow: var(--menu-shadow);
}

.user-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
}

.user-email {
  font-weight: 600;
  font-size: var(--font-size-sub);
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.menu-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px;
  color: var(--text);
  border-radius: 8px;
  cursor: pointer;
  font-size: var(--font-size-sub);
  transition: background 0.2s ease;
}

.menu-btn:hover {
  background: var(--gg);
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
  gap: 8px;
  line-height: 1;
}

.menu-btn-content svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  overflow: visible !important;
}

.lucide-graduation-cap {
  transform: rotate(0);
  transition: 0.1s ease;
  transform-origin: 80% 70%;
}

.menu-btn:hover .lucide-graduation-cap {
  transform: rotate(10deg);
}

.lucide-graduation-cap :deep(path:nth-child(2)) {
  transform: rotate(0) translateX(0) translateY(0);
  transform-origin: inherit !important;
  transition: 0.1s ease;
}

.menu-btn:hover .lucide-graduation-cap :deep(path:nth-child(2)) {
  transform: rotate(-10deg) translateX(0.7px) translateY(0.5px);
}

.lucide-shield-check :deep(path:last-child) {
  stroke-dasharray: 9;
  stroke-dashoffset: 9;
  transition: 0.1s ease;
}

.menu-btn:hover .lucide-shield-check :deep(path:last-child) {
  stroke-dashoffset: 0;
}

.lucide-key-round {
  transform: translate(0);
  transition: 0.1s ease;
}

.menu-btn:hover .lucide-key-round {
  transform: translate(-1px, 1px);
}

.lucide-log-out :deep(path:first-child),
.lucide-log-out :deep(path:nth-child(2)) {
  transform: translateX(0);
  transition: 0.1s ease;
}

.menu-btn:hover .lucide-log-out :deep(path:first-child),
.menu-btn:hover .lucide-log-out :deep(path:nth-child(2)) {
  transform: translateX(2px);
}

.lucide-trash-2 :deep(path:nth-child(3)) {
  height: 6px;
}

.lucide-trash-2 :deep(path:nth-child(4)),
.lucide-trash-2 :deep(path:nth-child(5)) {
  transform: translateY(0) translateX(0) rotate(0);
  transition: 0.1s ease;
  transform-origin: 80% 30%;
}

.menu-btn:hover .lucide-trash-2 :deep(path:nth-child(4)),
.menu-btn:hover .lucide-trash-2 :deep(path:nth-child(5)) {
  transform: translateY(-1px) translateX(1px) rotate(10deg);
}

.menu-divider {
  height: 1px;
  background: var(--border2);
  margin-inline: 4px;
}

.message {
  font-size: var(--font-size-sub);
  padding: 8px;
  border-radius: 4px;
  text-align: center;
}

.message.error {
  background: var(--special--red--background);
  color: var(--special--red);
}

.message.success {
  background: var(--special--green--background);
  color: var(--special--green);
}

.pop-enter-active, .pop-leave-active {
  transition: transform 120ms cubic-bezier(.2,.9,.2,1), opacity 120ms ease;
  transform-origin: top left;
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

@media (max-width: 480px) {
  .popup-inner {
    min-width: 100%;
  }
  .popup {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .pop-enter-active, .pop-leave-active {
    transform-origin: top center;
  }
  .avatar-circle {
    width: 26px;
    height: 26px;
    font-size: 12px;
  }
  .account-menu {
    height: 26px;
  }
}
</style>