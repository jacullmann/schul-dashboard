<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BaseTabs from '@/common/components/BaseTabs.vue';
import MfaSettings from '@/modules/auth/components/MfaSettings.vue';
import ConnectedAccounts from '@/modules/auth/components/ConnectedAccounts.vue';
import { useMfa } from '@/modules/auth/composables/useMfa';

const props = defineProps<{
  initialMfaEnabled?: boolean;
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'mfaChanged', enabled: boolean): void;
}>();

const { mfaEnabled, fetchMfaStatus, setMfaEnabled } = useMfa();
const tabs = [
  { id: 'mfa', label: 'MFA', routePath: '' },
  { id: 'connected', label: 'Verbundene Konten', routePath: '' },
];

const activeTab = ref('mfa');

function handleTabChange(newId: string) {
  activeTab.value = newId;
}

function onMfaChanged(enabled: boolean) {
  setMfaEnabled(enabled);
  emit('mfaChanged', enabled);
}

onMounted(async () => {
  if (props.initialMfaEnabled !== undefined) {
    setMfaEnabled(props.initialMfaEnabled);
  } else {
    await fetchMfaStatus();
  }
});
</script>

<template>
  <BaseModal :open="open" @cancel="emit('cancel')">
    <template #title> Sicherheit </template>

    <template #content>
      <div class="mb-4">
        <BaseTabs
          :items="tabs"
          :active-id="activeTab"
          @change="handleTabChange"
        />
      </div>

      <div v-if="activeTab === 'mfa'" class="flex flex-col gap-4">
        <MfaSettings :mfa-enabled="mfaEnabled" @mfa-changed="onMfaChanged" />
      </div>

      <div v-else-if="activeTab === 'connected'" class="flex flex-col gap-4">
        <ConnectedAccounts />
      </div>
    </template>
  </BaseModal>
</template>
