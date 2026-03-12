<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TabSwitcher from '@/common/components/TabSwitcher.vue';
import MfaSettings from '@/modules/auth/components/MfaSettings.vue';
import { useMfa } from '@/modules/auth/composables/useMfa';
import Modal from '@/common/components/Modal.vue';

const props = defineProps<{
  initialMfaEnabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'mfaChanged', enabled: boolean): void;
}>();

const { mfaEnabled, fetchMfaStatus, setMfaEnabled } = useMfa();
const tabs = [
  { id: 'mfa', label: 'MFA', routePath: '' }
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
  <Modal>
    <template #title>
      Sicherheit
    </template>

    <template #content>
      <div class="tab-wrapper">
        <TabSwitcher
            :items="tabs"
            :active-id="activeTab"
            @change="handleTabChange"
        />
      </div>

      <!-- Tab Content -->
      <div v-if="activeTab === 'mfa'" class="mfa-section">
        <MfaSettings
            :mfa-enabled="mfaEnabled"
            @mfa-changed="onMfaChanged"
        />
      </div>
    </template>

    <template #actions>
      <div></div>
    </template>
  </Modal>
</template>

<style scoped>
.tab-wrapper {
  margin-bottom: 16px;
}

.mfa-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>