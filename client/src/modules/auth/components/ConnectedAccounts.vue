<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import GoogleIcon from '@/modules/auth/components/GoogleIcon.vue';

const { fetchLinkedProviders, unlinkGoogleAccount, initiateGoogleLogin } = useOAuth();

interface Provider {
  provider: string;
  email: string;
}

const providers = ref<Provider[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const googleLinked = () => providers.value.some((p) => p.provider === 'google');
const googleProvider = () => providers.value.find((p) => p.provider === 'google');

onMounted(async () => {
  providers.value = await fetchLinkedProviders();
  loading.value = false;
});

async function handleUnlink() {
  errorMsg.value = '';
  successMsg.value = '';
  actionLoading.value = true;

  const result = await unlinkGoogleAccount();
  actionLoading.value = false;

  if (result.ok) {
    providers.value = providers.value.filter((p) => p.provider !== 'google');
    successMsg.value = 'Google-Konto getrennt.';
  } else {
    errorMsg.value = result.error;
  }
}

function handleLink() {
  initiateGoogleLogin();
}
</script>

<template>
  <div class="connected-accounts">
    <div v-if="loading" class="loading-row">
      <LoadingSpinner size="1.2em" />
    </div>

    <template v-else>
      <!-- Google provider row -->
      <div class="provider-row">
        <div class="provider-info">
          <div class="provider-icon" aria-hidden="true">
            <GoogleIcon :size="20" />
          </div>
          <div class="provider-text">
            <span class="provider-name">Google</span>
            <span v-if="googleLinked()" class="provider-email">{{ googleProvider()?.email }}</span>
            <span v-else class="provider-status">Nicht verknüpft</span>
          </div>
        </div>

        <div class="provider-action">
          <span v-if="googleLinked()" class="linked-badge">Verknüpft</span>

          <BaseButton
              v-if="googleLinked()"
              variant="ghost"
              class="small"
              :loading="actionLoading"
              @click="handleUnlink"
          >
            Trennen
          </BaseButton>

          <BaseButton
              v-else
              variant="action"
              class="small"
              :loading="actionLoading"
              @click="handleLink"
          >
            Verknüpfen
          </BaseButton>
        </div>
      </div>

      <div v-if="errorMsg" class="feedback error">{{ errorMsg }}</div>
      <div v-if="successMsg" class="feedback success">{{ successMsg }}</div>
    </template>
  </div>
</template>

<style scoped>
.connected-accounts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-row {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.provider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-lg);
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--color-canvas);
  border: 1px solid var(--color-canvas-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.provider-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-name {
  font-size: var(--text-sub);
  font-weight: 600;
  color: var(--color-on-surface);
}

.provider-email {
  font-size: var(--text-footnote);
  color: var(--color-on-surface-muted);
}

.provider-status {
  font-size: var(--text-footnote);
  color: var(--color-on-surface-muted);
}

.provider-action {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.linked-badge {
  font-size: var(--text-footnote);
  color: var(--special--green);
  background: var(--color-success-surface);
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
}

.btn.small {
  padding: 4px 12px;
  font-size: var(--text-footnote);
  min-height: 28px;
}

.feedback {
  font-size: var(--text-sub);
  padding: 8px 12px;
  border-radius: var(--radius-lg);
}

.feedback.error {
  color: var(--color-danger);
  background: var(--color-danger-surface);
}

.feedback.success {
  color: var(--special--green);
  background: var(--color-success-surface);
}
</style>
