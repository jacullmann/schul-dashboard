<script setup lang="ts">
import { ref } from 'vue';
import { Trash2, LogOut, LucideGraduationCap, LucideKeyRound, ShieldCheck } from '@lucide/vue';
import ChangePasswordModal from '@/modules/auth/components/ChangePasswordModal.vue';
import DeleteAccountModal from '@/modules/auth/components/DeleteAccountModal.vue';
import PersonalizationDropdown from '@/modules/auth/components/PersonalizationDropdown.vue';
import ThemeMenuDropdown from '@/common/components/ThemeMenuDropdown.vue';
import LocaleMenuDropdown from '@/common/components/LocaleMenuDropdown.vue';
import SecurityModal from '@/modules/auth/components/SecurityModal.vue';
import Avatar from '@/modules/auth/components/Avatar.vue';
import { useI18n } from 'vue-i18n';
import { useAccountMenu } from '@/modules/auth/composables/useAccountMenu';
import type { UserData } from '@/stores/userStore';

const { t } = useI18n();

const props = defineProps<{
  email: string;
  userData: UserData | null;
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
  personalizationSetting,
  onPersonalizationChange,
  open,
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

<template>
  <div class="relative flex h-8 max-[480px]:h-[26px]" ref="root">
    <Avatar
        class="icon-btn"
        :email="email"
        @click="toggle"
        :aria-expanded="open"
        :title="'Account menu'"
    />

    <BaseMenu
        v-if="open"
        class="fixed pointer-events-auto z-1400 max-[480px]:justify-center max-[480px]:flex max-[480px]:flex-col origin-top-left max-[480px]:origin-top min-w-[320px] max-[480px]:w-full"
        :style="popupStyle"
        @click.stop
        role="menu"
        aria-label="Account menu"
        :ref="(el: any) => popupInner = el?.$el"
    >
      <div class="flex px-2 py-1">
        <div class="font-semibold text-sub text-on-surface overflow-hidden text-ellipsis whitespace-nowrap flex-1" :title="email">{{ email }}</div>
      </div>

      <BaseMenuDivider />

      <ThemeMenuDropdown class="icon-trigger" />

      <LocaleMenuDropdown class="icon-trigger" />

      <BaseMenuButton
          class="icon-trigger"
          ref="firstMenuBtnRef"
          @click="openSetup"
      >
        <LucideGraduationCap :size="16"/>
        {{ t('account.menu.courses.title') }}
      </BaseMenuButton>

      <PersonalizationDropdown
          class="icon-trigger"
          v-model="personalizationSetting"
          @change="onPersonalizationChange"
      />

      <BaseMenuDivider />

      <BaseMenuButton
          class="icon-trigger"
          @click="openSecurity"
      >
        <ShieldCheck :size="16"/>
        {{ t('account.menu.security.title') }}
      </BaseMenuButton>

      <BaseMenuButton
          class="icon-trigger"
          @click="openChangePassword"
      >
        <LucideKeyRound :size="16"/>
        {{ t('account.menu.changePassword.title') }}
      </BaseMenuButton>

      <BaseMenuButton
          class="icon-trigger"
          @click="handleLogout"
      >
        <LogOut :size="16"/>
        {{ t('account.menu.logout') }}
      </BaseMenuButton>

      <BaseMenuDivider />

      <BaseMenuButton
          class="icon-trigger"
          variant="danger"
          @click="startDelete"
      >
        <Trash2 :size="16"/>
        {{ t('account.menu.deleteAccount.title') }}
      </BaseMenuButton>
    </BaseMenu>

    <ChangePasswordModal
        v-if="showChangePassword"
        @cancel="showChangePassword = false"
        @success="onPasswordChanged"
    />

    <SecurityModal
        v-if="showSecurity"
        :initial-mfa-enabled="userData?.mfaEnabled"
        @cancel="showSecurity = false"
        @mfa-changed="onMfaChanged"
    />

    <DeleteAccountModal
        v-if="showDeleteAccount"
        :email="email"
        @cancel="showDeleteAccount = false"
        @deleted="onAccountDeleted"
        @error="onDeleteError"
    />
  </div>
</template>

<style scoped>
.lucide-graduation-cap {
  transform: rotate(0);
  transition: 0.1s ease;
  transform-origin: 80% 70%;
}

.icon-trigger:hover .lucide-graduation-cap {
  transform: rotate(10deg);
}

.lucide-graduation-cap :deep(path:nth-child(2)) {
  transform: rotate(0) translateX(0) translateY(0);
  transform-origin: inherit !important;
  transition: 0.1s ease;
}

.icon-trigger:hover .lucide-graduation-cap :deep(path:nth-child(2)) {
  transform: rotate(-10deg) translateX(0.7px) translateY(0.5px);
}

.lucide-shield-check :deep(path:last-child) {
  stroke-dasharray: 9;
  stroke-dashoffset: 9;
  transition: 0.1s ease;
}

.icon-trigger:hover .lucide-shield-check :deep(path:last-child) {
  stroke-dashoffset: 0;
}

.lucide-key-round {
  transform: translate(0);
  transition: 0.1s ease;
}

.icon-trigger:hover .lucide-key-round {
  transform: translate(-1px, 1px);
}

.lucide-log-out :deep(path:first-child),
.lucide-log-out :deep(path:nth-child(2)) {
  transform: translateX(0);
  transition: 0.1s ease;
}

.icon-trigger:hover .lucide-log-out :deep(path:first-child),
.icon-trigger:hover .lucide-log-out :deep(path:nth-child(2)) {
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

.icon-trigger:hover .lucide-trash-2 :deep(path:nth-child(4)),
.icon-trigger:hover .lucide-trash-2 :deep(path:nth-child(5)) {
  transform: translateY(-1px) translateX(1px) rotate(10deg);
}
</style>
