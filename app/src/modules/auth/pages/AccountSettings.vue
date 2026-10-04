<script setup lang="ts">
import { markRaw, computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { ArrowLeft, Shield, UserRound } from '@lucide/vue';
import { useUserStore } from '@/stores/userStore';
import {
  useChangePasswordModal,
  useDeleteAccountModal,
} from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useReturnRoute } from '@/common/composables/useReturnRoute';
import { type AdminNavItem } from '@/layouts/AdminLayout.vue';
import AccountSettingsSecurity from '@/modules/auth/components/AccountSettingsSecurity.vue';
import AccountSettingsAccount from '@/modules/auth/components/AccountSettingsAccount.vue';
import LegalLinks from '@/modules/auth/components/LegalLinks.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { user } = storeToRefs(useUserStore());
const changePasswordModal = useChangePasswordModal();
const deleteAccountModal = useDeleteAccountModal();
const { homeRoute } = useAppAuth();
const { leave: leaveSettings } = useReturnRoute(homeRoute);

const navItems = computed<AdminNavItem[]>(() => [
  {
    id: 'security',
    label: t('auth.account_settings.security.title'),
    icon: markRaw(Shield),
  },
  {
    id: 'account',
    label: t('auth.account_settings.account.title'),
    icon: markRaw(UserRound),
  },
]);

const activeTab = computed<string>({
  get() {
    return (route.params.tab as string) || '';
  },
  set(val) {
    void router.push({
      name: 'account-settings',
      params: val ? { tab: val } : {},
    });
  },
});

const securitySubTabLabels = computed<Record<string, string>>(() => ({
  'two-factor': t('auth.security.2fa'),
  'connected-accounts': t('auth.account_settings.connected_accounts.title'),
  sessions: t('auth.sessions.title'),
}));

const activeTabLabel = computed(() => {
  const subTab = route.params.subTab as string | undefined;
  if (activeTab.value === 'security' && subTab) {
    return securitySubTabLabels.value[subTab] ?? '';
  }
  return navItems.value.find((n) => n.id === activeTab.value)?.label ?? '';
});

const transitionDirection = ref<'forward' | 'backward'>('forward');

const transitionName = computed(() =>
  transitionDirection.value === 'forward' ? 'slide-forward' : 'slide-backward',
);

watch(
  () => ({
    tab: route.params.tab as string | undefined,
    subTab: route.params.subTab as string | undefined,
  }),
  (newVal, oldVal) => {
    const [next, prev] =
      newVal.tab !== oldVal.tab
        ? [newVal.tab, oldVal.tab]
        : [newVal.subTab, oldVal.subTab];
    if (next && !prev) {
      transitionDirection.value = 'forward';
    } else if (!next && prev) {
      transitionDirection.value = 'backward';
    }
  },
);

function selectTab(id: string) {
  transitionDirection.value = 'forward';
  activeTab.value = id;
}

function goBack() {
  transitionDirection.value = 'backward';
  if (route.params.subTab) {
    void router.push({
      name: 'account-settings',
      params: { tab: activeTab.value },
    });
  } else {
    activeTab.value = '';
  }
}
</script>

<template>
  <div class="phone-settings-container">
    <Transition :name="transitionName">
      <div v-if="!activeTab" key="master" class="settings-pane master-pane">
        <header
          class="px-4 py-2 md:px-6 bg-canvas border-b border-ghost-border shrink-0"
        >
          <div class="w-full max-w-200 mx-auto flex items-center gap-2">
            <BaseButton
              variant="ghost"
              on="ghost"
              :aria-label="t('auth.account_settings.back')"
              :icon="ArrowLeft"
              @click="leaveSettings"
            />
            <div>
              <h2>{{ t('auth.account_settings.title') }}</h2>
              <div
                v-if="user?.email"
                class="text-on-ghost-muted font-semibold text-base"
              >
                {{ user.email }}
              </div>
            </div>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto overscroll-contain p-0 md:p-4">
          <div class="flex flex-col max-w-200 mx-auto">
            <BaseList
              v-for="(item, index) in navItems"
              :key="item.id"
              :separator="index !== navItems.length - 1"
              @click="selectTab(item.id)"
            >
              <template #icon>
                <component :is="item.icon" :size="20" :stroke-width="1.8" />
              </template>
              <template #label>
                {{ item.label }}
              </template>
            </BaseList>

            <LegalLinks class="mt-8 mb-4" />
          </div>
        </div>
      </div>

      <div
        v-else
        :key="
          activeTab + (route.params.subTab ? '-' + route.params.subTab : '')
        "
        class="settings-pane detail-pane"
      >
        <header
          class="flex items-center py-2 px-4 md:px-6 bg-canvas border-b border-ghost-border shrink-0"
        >
          <div class="max-w-250 my-0 mx-auto flex items-center w-full gap-2">
            <BaseButton
              variant="ghost"
              on="ghost"
              :aria-label="t('auth.account_settings.back')"
              :icon="ArrowLeft"
              @click="goBack"
            />
            <h2>{{ activeTabLabel }}</h2>
          </div>
        </header>

        <div
          class="flex-1 overflow-y-auto overscroll-contain p-6 pt-4 md:py-8 bg-canvas"
        >
          <div class="w-full max-w-250 mx-auto">
            <AccountSettingsSecurity
              v-if="activeTab === 'security'"
              @change-password="changePasswordModal.open()"
            />

            <AccountSettingsAccount
              v-else-if="activeTab === 'account'"
              :email="user?.email ?? ''"
              @delete-account="deleteAccountModal.open()"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.phone-settings-container {
  position: relative;
  width: 100%;
  height: calc(100dvh - var(--header-height) - var(--announcement-height));
  overflow: hidden;
  background: var(--color-canvas);
  display: flex;
}

.settings-pane {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-canvas);
  overflow: hidden;
}

.slide-forward-enter-active,
.slide-forward-leave-active,
.slide-backward-enter-active,
.slide-backward-leave-active {
  transition:
    transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.45s ease;
}

.slide-forward-enter-from {
  transform: translateX(100%);
  z-index: 2;
}
.slide-forward-enter-to {
  transform: translateX(0);
  z-index: 2;
}
.slide-forward-leave-from {
  transform: translateX(0);
  opacity: 1;
  z-index: 1;
}
.slide-forward-leave-to {
  transform: translateX(-15%);
  opacity: 0.6;
  z-index: 1;
}

.slide-backward-enter-from {
  transform: translateX(-15%);
  opacity: 0.6;
  z-index: 1;
}
.slide-backward-enter-to {
  transform: translateX(0);
  opacity: 1;
  z-index: 1;
}
.slide-backward-leave-from {
  transform: translateX(0);
  z-index: 2;
}
.slide-backward-leave-to {
  transform: translateX(100%);
  z-index: 2;
}
</style>
