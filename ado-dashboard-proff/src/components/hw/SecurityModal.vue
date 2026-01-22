<template>
  <div class="blurit">
    <div class="modal-wrapper">
      <div class="card rlc modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Sicherheit</h3>
          <button
              data-umami-event="SecurityModal schließen"
              class="btn ghost close-btn"
              @click="$emit('close')"
          >
            Schließen
          </button>
        </div>
        <div class="tab-wrapper">
          <TabSwitcher
              :items="tabs"
              :active-id="activeTab"
              @change="handleTabChange"
          />
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <div v-if="activeTab === 'mfa'" class="mfa-section">
            <MfaSettings
                :mfa-enabled="mfaEnabled"
                @mfa-changed="onMfaChanged"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TabSwitcher from '../TabSwitcher.vue';
import MfaSettings from './MfaSettings.vue';
import { useMfa } from '../../composables/useMfa';

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

<style scoped>
.modal-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 480px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--lbg);
  padding: 24px;
  box-shadow: var(--shadow-l);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  margin: 0;
  color: var(--text);
  font-size: var(--font-size-h2);
  font-weight: 700;
}

.close-btn {
  color: var(--text);
  padding: 8px 12px;
}

.tab-wrapper {
  margin-bottom: 24px;
}

.tab-content {
  min-height: 200px;
}

.mfa-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 500px) {
  .modal-card {
    max-width: 100%;
    margin: 0;
    padding: 20px;
  }

  .modal-title {
    font-size: var(--font-size-h3);
  }
}
</style>