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

const props = withDefaults(
  defineProps<{
    email: string;
    userData: UserData | null;
    expanded?: boolean;
  }>(),
  {
    expanded: true,
  },
);

const emit = defineEmits<{
  (e: 'logout'): void;
  (e: 'personalizationChanged', value: boolean): void;
}>();

const root = ref<HTMLElement | null>(null);
const popupInner = ref<HTMLElement | null>(null);
const firstMenuBtnRef = ref<{ focus: () => void } | null>(null);
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
  <div class="relative flex w-full" ref="root">
    <button
      type="button"
      v-wave
      class="relative flex items-center p-1 rounded-full w-full bg-transparent hover:bg-ghost-hover transition-hover cursor-pointer text-left touch-target"
      @click="toggle"
    >
      <Avatar
        :name="email"
        @keydown.enter="toggle"
        @keydown.space.prevent="toggle"
        :aria-expanded="open"
        title="Account menu"
      />

      <span
        class="flex flex-col transition-[max-width,opacity,margin-left]"
        :class="
          expanded
            ? 'max-w-44 opacity-100 ml-2 duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
            : 'max-w-0 opacity-0 ml-0 duration-150 ease-[cubic-bezier(0.32,0,0.67,1)]'
        "
      >
        <span class="text-sm font-medium text-on-ghost truncate">{{
          email
        }}</span>
      </span>
    </button>

    <BaseMenu
      :open="open"
      class="fixed pointer-events-auto z-[var(--z-modal)] origin-top-left min-w-[320px]"
      :style="popupStyle"
      @click.stop
      @cancel="cancel"
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
        {{ t('auth.courses.title') }}
      </BaseMenuButton>

      <PersonalizationSubmenu
        v-model="personalizationSetting"
        @change="onPersonalizationChange"
      />

      <BaseMenuDivider />

      <BaseMenuButton :icon="Shield" @click="openSecurity">
        {{ t('auth.security.title') }}
      </BaseMenuButton>

      <BaseMenuButton :icon="LucideKeyRound" @click="openChangePassword">
        {{ t('auth.change_password.title') }}
      </BaseMenuButton>

      <BaseMenuButton :icon="LogOut" @click="handleLogout">
        {{ t('auth.actions.logout') }}
      </BaseMenuButton>

      <BaseMenuDivider />

      <BaseMenuButton :icon="Trash2" variant="danger" @click="startDelete">
        {{ t('auth.delete_account.title') }}
      </BaseMenuButton>
    </BaseMenu>
  </div>
</template>
