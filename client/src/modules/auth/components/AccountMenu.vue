<script setup lang="ts">
import { ref } from 'vue';
import { Trash2, LogOut, LucideGraduationCap, LucideKeyRound, ShieldCheck } from '@lucide/vue';
import ChangePasswordModal from '@/modules/auth/components/ChangePasswordModal.vue';
import CompleteSetup from '@/modules/auth/components/CompleteSetup.vue';
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
  showSetup,
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

function onSetupSuccess(updatedUser: any) {
  emit('personalizationChanged', updatedUser?.personalized ?? true);
  showSetup.value = false;
}
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

      <ThemeMenuDropdown />

      <LocaleMenuDropdown />

      <BaseMenuButton
          ref="firstMenuBtnRef"
          @click="openSetup"
      >
        <LucideGraduationCap :size="16"/>
        {{ t('account.menu.courses.title') }}
      </BaseMenuButton>

      <PersonalizationDropdown
          v-model="personalizationSetting"
          @change="onPersonalizationChange"
      />

      <BaseMenuDivider />

      <BaseMenuButton
          @click="openSecurity"
      >
        <ShieldCheck :size="16"/>
        {{ t('account.menu.security.title') }}
      </BaseMenuButton>

      <BaseMenuButton
          @click="openChangePassword"
      >
        <LucideKeyRound :size="16"/>
        {{ t('account.menu.changePassword.title') }}
      </BaseMenuButton>

      <BaseMenuButton
          @click="handleLogout"
      >
        <LogOut :size="16"/>
        {{ t('account.menu.logout') }}
      </BaseMenuButton>

      <BaseMenuDivider />

      <BaseMenuButton
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

    <CompleteSetup
        v-if="showSetup && userData"
        :visible="showSetup"
        :is-setup="!userData.doneSetup"
        :initial-data="{
          enrKurs: userData.enrKurs || null,
          wpuKurs1: userData.wpuKurs1 || null,
          wpuKurs2: userData.wpuKurs2 || null,
          theater: userData.theater || 0,
        }"
        @cancel="showSetup = false"
        @success="showSetup = false"
        @update:user="onSetupSuccess"
    />
  </div>
</template>
