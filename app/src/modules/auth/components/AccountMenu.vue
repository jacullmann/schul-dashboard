<script setup lang="ts">
import { ref } from 'vue';
import { Trash2, LogOut, LucideGraduationCap, LucideKeyRound, Shield } from '@lucide/vue';
import PersonalizationDropdown from '@/modules/auth/components/PersonalizationDropdown.vue';
import ThemeMenuDropdown from '@/common/components/ThemeMenuDropdown.vue';
import LocaleMenuDropdown from '@/common/components/LocaleMenuDropdown.vue';
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
        class="fixed pointer-events-auto z-[var(--z-modal)] max-[480px]:justify-center max-[480px]:flex max-[480px]:flex-col origin-top-left max-[480px]:origin-top min-w-[320px] max-[480px]:w-full"
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
        <Shield :size="16"/>
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
  </div>
</template>
