<script setup lang="ts">
import { markRaw, computed, ref, watch, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { ArrowLeft, Shield, UserRound } from '@lucide/vue';
import { useUserStore } from '@/stores/userStore';
import { useModalStore } from '@/stores/modalStore';
import AccountSettingsSecurity from '@/modules/auth/components/AccountSettingsSecurity.vue';
import AccountSettingsAccount from '@/modules/auth/components/AccountSettingsAccount.vue';

interface AccountNavItem {
  id: string;
  label: string;
  description: string;
  icon: Component;
}

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { user } = storeToRefs(useUserStore());
const modalStore = useModalStore();

const navItems = computed<AccountNavItem[]>(() => [
  {
    id: 'security',
    label: t('auth.account_settings.security.title'),
    description: t('auth.account_settings.security.description'),
    icon: markRaw(Shield),
  },
  {
    id: 'account',
    label: t('auth.account_settings.account.title'),
    description: t('auth.account_settings.account.description'),
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

const activeTabLabel = computed(
  () => navItems.value.find((n) => n.id === activeTab.value)?.label ?? '',
);

const transitionDirection = ref<'forward' | 'backward'>('forward');

const transitionName = computed(() =>
  transitionDirection.value === 'forward' ? 'slide-forward' : 'slide-backward',
);

watch(
  () => route.params.tab as string | undefined,
  (newTab, oldTab) => {
    if (newTab && !oldTab) {
      transitionDirection.value = 'forward';
    } else if (!newTab && oldTab) {
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
  activeTab.value = '';
}
</script>

<template>
  <div class="phone-settings-container">
    <Transition :name="transitionName">
      <div v-if="!activeTab" key="master" class="settings-pane master-pane">
        <header
          class="p-4 pt-2 md:px-6 bg-canvas border-b border-ghost-border shrink-0"
        >
          <div class="w-full max-w-200 mx-auto">
            <h1>{{ t('auth.account_settings.title') }}</h1>
            <div
              v-if="user?.email"
              class="text-on-ghost-muted font-semibold text-base"
            >
              {{ user.email }}
            </div>
          </div>
        </header>

        <div class="p-0 md:p-4">
          <div class="flex flex-col max-w-200 mx-auto">
            <BaseList
              v-for="(item, index) in navItems"
              :key="item.id"
              class="animate-fade-up"
              :separator="index !== navItems.length - 1"
              :chevron="true"
              @click="selectTab(item.id)"
            >
              <template #icon>
                <span class="flex size-10 justify-center items-center">
                  <component :is="item.icon" :size="24" />
                </span>
              </template>
              <template #label>
                <span class="flex flex-col min-h-10 justify-between">
                  <span class="text-on-ghost text-base/tight font-medium">{{
                    item.label
                  }}</span>
                  <span class="text-on-ghost-muted text-xs/tight font-normal">{{
                    item.description
                  }}</span>
                </span>
              </template>
            </BaseList>
          </div>
        </div>
      </div>

      <div v-else :key="activeTab" class="settings-pane detail-pane">
        <header
          class="flex items-center py-4 md:py-6 h-16 bg-canvas border-b border-ghost-border shrink-0"
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

        <div class="flex-1 overflow-y-auto p-4 md:py-8 px-6 bg-canvas">
          <div class="w-full max-w-250 mx-auto">
            <AccountSettingsSecurity
              v-if="activeTab === 'security'"
              @change-password="modalStore.openChangePassword()"
            />

            <AccountSettingsAccount
              v-else-if="activeTab === 'account'"
              :email="user?.email ?? ''"
              @delete-account="modalStore.openDeleteAccount()"
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
  height: calc(100vh - var(--header-height) - var(--announcement-height));
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
