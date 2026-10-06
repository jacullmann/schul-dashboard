<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  Fingerprint,
  KeyRound,
  Link2,
  MonitorSmartphone,
  ShieldCheck,
} from '@lucide/vue';
import MfaSettings from '@/modules/auth/components/MfaSettings.vue';
import ConnectedAccounts from '@/modules/auth/components/ConnectedAccounts.vue';
import ActiveSessions from '@/modules/auth/components/ActiveSessions.vue';
import PasswordSettings from '@/modules/auth/components/PasswordSettings.vue';
import PasskeySettings from '@/modules/auth/components/PasskeySettings.vue';
import { useMfa } from '@/modules/auth/composables/useMfa';
import { useUserStore } from '@/stores/userStore';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const userStore = useUserStore();
const { mfaEnabled, fetchMfaStatus, setMfaEnabled } = useMfa();

const subTab = computed(() => route.params.subTab as string | undefined);

function openSubTab(id: string) {
  void router.push({
    name: 'account-settings',
    params: { tab: 'security', subTab: id },
  });
}

function onMfaChanged(enabled: boolean) {
  setMfaEnabled(enabled);
  userStore.setMfaEnabled(enabled);
}

onMounted(async () => {
  if (userStore.user) {
    setMfaEnabled(userStore.user.mfaEnabled);
  } else {
    await fetchMfaStatus();
  }
});
</script>

<template>
  <div v-if="!subTab" class="flex flex-col max-w-200 mx-auto max-md:-mx-6">
    <BaseList @click="openSubTab('password')">
      <template #icon>
        <KeyRound :size="20" :stroke-width="1.8" />
      </template>
      <template #label>
        {{ t('auth.security.password') }}
      </template>
    </BaseList>

    <BaseList @click="openSubTab('passkeys')">
      <template #icon>
        <Fingerprint :size="20" :stroke-width="1.8" />
      </template>
      <template #label>
        {{ t('auth.passkeys.title') }}
      </template>
    </BaseList>

    <BaseList @click="openSubTab('two-factor')">
      <template #icon>
        <ShieldCheck :size="20" :stroke-width="1.8" />
      </template>
      <template #label>
        {{ t('auth.security.2fa') }}
      </template>
    </BaseList>

    <BaseList @click="openSubTab('connected-accounts')">
      <template #icon>
        <Link2 :size="20" :stroke-width="1.8" />
      </template>
      <template #label>
        {{ t('auth.account_settings.connected_accounts.title') }}
      </template>
    </BaseList>

    <BaseList :separator="false" @click="openSubTab('sessions')">
      <template #icon>
        <MonitorSmartphone :size="20" :stroke-width="1.8" />
      </template>
      <template #label>
        {{ t('auth.sessions.title') }}
      </template>
    </BaseList>
  </div>

  <section v-else-if="subTab === 'password'" class="max-w-160">
    <PasswordSettings />
  </section>

  <section v-else-if="subTab === 'passkeys'" class="max-w-160">
    <PasskeySettings />
  </section>

  <section v-else-if="subTab === 'two-factor'" class="max-w-160">
    <MfaSettings :mfa-enabled="mfaEnabled" @mfa-changed="onMfaChanged" />
  </section>

  <section
    v-else-if="subTab === 'connected-accounts'"
    class="flex flex-col gap-2 max-w-160"
  >
    <p class="text-sm/relaxed text-on-ghost-muted m-0!">
      {{ t('auth.account_settings.connected_accounts.description') }}
    </p>
    <ConnectedAccounts />
  </section>

  <section v-else-if="subTab === 'sessions'" class="max-w-160">
    <ActiveSessions />
  </section>
</template>
