<script setup lang="ts">
import { ref } from 'vue';
import {
  Trash2,
  LogOut,
  LucideGraduationCap,
  LucideKeyRound,
  Shield,
} from '@lucide/vue';
import PersonalizationSubmenu from '@/modules/auth/components/PersonalizationSubmenu.vue';
import ThemeSubmenu from '@/modules/auth/components/ThemeSubmenu.vue';
import LocaleSubmenu from '@/modules/auth/components/LocaleSubmenu.vue';
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
  (e: 'logout'): void;
  (e: 'personalizationChanged', value: boolean): void;
}>();

const root = ref<HTMLElement | null>(null);
const popupInner = ref<HTMLElement | null>(null);
const firstMenuBtnRef = ref<{ focus: () => void } | null>(null);
// Ref to BaseMenu component — gives us access to startClose() for animated dismiss
const baseMenuRef = ref<{
  startClose: () => void;
  menuEl: HTMLElement | null;
} | null>(null);

const {
  personalizationSetting,
  onPersonalizationChange,
  open,
  popupStyle,
  handleLogout,
  openSetup,
  openChangePassword,
  openSecurity,
  startDelete,
  toggle,
  cancel,
} = useAccountMenu(props, emit, {
  root,
  popupInner,
  firstMenuBtnRef,
  baseMenu: baseMenuRef,
});
</script>

<template>
  <div class="relative flex h-8" ref="root">
    <Avatar
      :email="email"
      @click="toggle"
      @keydown.enter="toggle"
      @keydown.space.prevent="toggle"
      :aria-expanded="open"
      :title="'Account menu'"
    />

    <!--
      No <Transition> wrapper here on mobile — BaseMenu owns its own
      enter/exit animations (sheet-up / sheet-down) via CSS @keyframes.
      On desktop the dropdown appears instantly (same as before the rewrite).
    -->
    <BaseMenu
      :open="open"
      class="fixed pointer-events-auto z-[var(--z-modal)] origin-top-left min-w-[320px]"
      :style="popupStyle"
      @click.stop
      @close="cancel"
      role="menu"
      aria-label="Account menu"
      :ref="
        (el: any) => {
          baseMenuRef = el;
          popupInner = el?.menuEl ?? null;
        }
      "
    >
      <div
        class="flex justify-center md:justify-start px-4 py-2 md:px-3 md:py-1.5 font-semibold text-base md:text-sm text-on-ghost overflow-hidden text-ellipsis whitespace-nowrap"
        :title="email"
      >
        {{ email }}
      </div>

      <BaseMenuDivider />

      <ThemeSubmenu />

      <LocaleSubmenu />

      <BaseMenuButton
        ref="firstMenuBtnRef"
        :icon="LucideGraduationCap"
        @click="openSetup"
      >
        {{ t('account.menu.courses.title') }}
      </BaseMenuButton>

      <PersonalizationSubmenu
        v-model="personalizationSetting"
        @change="onPersonalizationChange"
      />

      <BaseMenuDivider />

      <BaseMenuButton :icon="Shield" @click="openSecurity">
        {{ t('account.menu.security.title') }}
      </BaseMenuButton>

      <BaseMenuButton :icon="LucideKeyRound" @click="openChangePassword">
        {{ t('account.menu.changePassword.title') }}
      </BaseMenuButton>

      <BaseMenuButton :icon="LogOut" @click="handleLogout">
        {{ t('account.menu.logout') }}
      </BaseMenuButton>

      <BaseMenuDivider />

      <BaseMenuButton :icon="Trash2" variant="danger" @click="startDelete">
        {{ t('account.menu.deleteAccount.title') }}
      </BaseMenuButton>
    </BaseMenu>
  </div>
</template>
