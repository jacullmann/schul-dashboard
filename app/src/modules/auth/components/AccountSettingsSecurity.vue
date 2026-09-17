<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { LucideKeyRound } from '@lucide/vue';
import MfaSettings from '@/modules/auth/components/MfaSettings.vue';
import ConnectedAccounts from '@/modules/auth/components/ConnectedAccounts.vue';
import ActiveSessions from '@/modules/auth/components/ActiveSessions.vue';
import { useMfa } from '@/modules/auth/composables/useMfa';
import { useUserStore } from '@/stores/userStore';

const emit = defineEmits<{
  (e: 'changePassword'): void;
}>();

const { t } = useI18n();
const userStore = useUserStore();
const { mfaEnabled, fetchMfaStatus, setMfaEnabled } = useMfa();

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
  <div class="animate-fade-up flex flex-col gap-10">
    <section class="flex flex-col gap-2">
      <h3>{{ t('auth.account_settings.password.title') }}</h3>
      <p class="text-sm/relaxed text-on-ghost-muted m-0!">
        {{ t('auth.account_settings.password.description') }}
      </p>
      <div>
        <BaseButton
          variant="ghost"
          :icon="LucideKeyRound"
          @click="emit('changePassword')"
        >
          {{ t('auth.change_password.title') }}
        </BaseButton>
      </div>
    </section>

    <section class="flex flex-col gap-2 max-w-160">
      <h3>{{ t('auth.security.2fa') }}</h3>
      <MfaSettings :mfa-enabled="mfaEnabled" @mfa-changed="onMfaChanged" />
    </section>

    <section class="flex flex-col gap-2 max-w-160">
      <h3>{{ t('auth.account_settings.connected_accounts.title') }}</h3>
      <p class="text-sm/relaxed text-on-ghost-muted m-0!">
        {{ t('auth.account_settings.connected_accounts.description') }}
      </p>
      <ConnectedAccounts />
    </section>

    <section class="max-w-160">
      <ActiveSessions />
    </section>
  </div>
</template>
