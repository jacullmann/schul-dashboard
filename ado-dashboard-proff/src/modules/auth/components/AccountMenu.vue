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

            <ThemeMenuDropdown />

            <LocaleMenuDropdown />

            <button
                ref="firstMenuBtnRef"
                class="menu-btn"
                @click="openSetup"
            >
              <div class="menu-btn-content">
                <LucideGraduationCap :size="16"/>
                {{ t('account.menu.courses.title') }}
              </div>
            </button>

            <PersonalizationDropdown
                v-model="personalizationSetting"
                @change="onPersonalizationChange"
            />
            <div class="menu-divider"></div>
            <button
                class="menu-btn"
                @click="openSecurity"
            >
              <div class="menu-btn-content">
                <ShieldCheck :size="16"/>
                {{ t('account.menu.security.title') }}
              </div>
            </button>

            <button
                class="menu-btn"
                @click="openChangePassword"
            >
              <div class="menu-btn-content">
                <LucideKeyRound :size="16"/>
                {{ t('account.menu.changePassword.title') }}
              </div>
            </button>

            <button
                class="menu-btn"
                @click="handleLogout"
            >
              <div class="menu-btn-content">
                <LogOut :size="16"/>
                {{ t('account.menu.logout') }}
              </div>
            </button>
            <div class="menu-divider"></div>
            <div class="danger-section">
              <button
                  class="menu-btn danger"
                  @click="startDelete"
              >
                <div class="menu-btn-content">
                  <Trash2 :size="16"/>
                  {{ t('account.menu.deleteAccount.title') }}
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
        @cancel="showChangePassword = false"
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
        @cancel="showDeleteAccount = false"
        @deleted="onAccountDeleted"
        @error="onDeleteError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Trash2, LogOut, LucideGraduationCap, LucideKeyRound, ShieldCheck } from "lucide-vue-next";
import ChangePasswordModal from '@/modules/auth/components/ChangePasswordModal.vue';
import DeleteAccountModal from '@/modules/auth/components/DeleteAccountModal.vue';
import PersonalizationDropdown from '@/modules/auth/components/PersonalizationDropdown.vue';
import ThemeMenuDropdown from '@/common/components/ThemeMenuDropdown.vue';
import LocaleMenuDropdown from '@/common/components/LocaleMenuDropdown.vue';
import SecurityModal from '@/modules/auth/components/SecurityModal.vue';
import { useI18n } from 'vue-i18n';
import { useAccountMenu } from '@/modules/auth/composables/useAccountMenu.ts';

const { t } = useI18n();

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

const root = ref<HTMLElement | null>(null);
const popupInner = ref<HTMLElement | null>(null);
const firstMenuBtnRef = ref<HTMLButtonElement | null>(null);

const {
  avatarLetter,
  avatarColor,
  personalizationSetting,
  onPersonalizationChange,
  open,
  errorMsg,
  successMsg,
  showChangePassword,
  showDeleteAccount,
  showSecurity,
  popupStyle,
  handleLogout,
  openSetup,
  openChangePassword,
  openSecurity,
  startDelete,
  onMfaChanged,
  onPasswordChanged,
  onAccountDeleted,
  onDeleteError,
  toggle
} = useAccountMenu(props, emit, { root, popupInner, firstMenuBtnRef });
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
  color: var(--special--red);
}

.menu-btn.danger:hover {
  background: var(--special--red--background);
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