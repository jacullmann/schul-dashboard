<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335"/>
            </svg>
          </div>
          <div class="provider-text">
            <span class="provider-name">Google</span>
            <span v-if="googleLinked()" class="provider-email">{{ googleProvider()?.email }}</span>
            <span v-else class="provider-status">Nicht verknüpft</span>
          </div>
        </div>

        <div class="provider-action">
          <span v-if="googleLinked()" class="linked-badge">Verknüpft</span>

          <button
              v-if="googleLinked()"
              class="btn ghost small"
              :disabled="actionLoading"
              @click="handleUnlink"
          >
            <LoadingSpinner v-if="actionLoading" size="1em" />
            <span v-else>Trennen</span>
          </button>

          <button
              v-else
              class="btn action small"
              :disabled="actionLoading"
              @click="handleLink"
          >
            Verknüpfen
          </button>
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
  background: var(--bg-surface);
  border: 1px solid var(--border-surface);
  border-radius: var(--border-radius-lg);
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
  background: var(--bg-canvas);
  border: 1px solid var(--border-canvas);
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
  font-size: var(--font-size-sub);
  font-weight: 600;
  color: var(--text-default);
}

.provider-email {
  font-size: var(--font-size-footnote);
  color: var(--sub);
}

.provider-status {
  font-size: var(--font-size-footnote);
  color: var(--sub);
}

.provider-action {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.linked-badge {
  font-size: var(--font-size-footnote);
  color: var(--special--green);
  background: var(--special--green--background);
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
}

.btn.small {
  padding: 4px 12px;
  font-size: var(--font-size-footnote);
  min-height: 28px;
}

.feedback {
  font-size: var(--font-size-sub);
  padding: 8px 12px;
  border-radius: var(--border-radius-lg);
}

.feedback.error {
  color: var(--danger);
  background: var(--danger-background);
}

.feedback.success {
  color: var(--special--green);
  background: var(--special--green--background);
}
</style>
