<script setup lang="ts">
import { onMounted, ref } from 'vue';
import hw from '@/api/hwApi';
import { CheckCircle2, XCircle, Info, AlertTriangle, ArrowLeft } from 'lucide-vue-next';
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const loading = ref(true);
const ok = ref(false);

onMounted(async () => {
  const params = new URLSearchParams(location.search);
  const token = params.get('token') || '';
  try {
    const { data } = await hw.get('/api/auth/verify', { params: { token } });
    ok.value = data.ok;
  } catch {
    ok.value = false;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="card verify-container">
    <div class="verify-content">
      <template v-if="loading">
        <div class="verify-icon loading-icon">
          <div class="spinner"></div>
        </div>
        <h1 class="verify-title">{{ t('groups.verify.verifying') }}</h1>
        <p class="verify-description">
          {{ t('groups.verify.wait') }}
        </p>
      </template>
      <template v-else-if="ok">
        <div class="verify-icon success-icon">
          <CheckCircle2 :size="64" />
        </div>
        <h1 class="verify-title">{{ t('groups.verify.success') }}</h1>
        <p class="verify-description">
          {{ t('groups.verify.successDescription') }}
        </p>

        <div class="info-card">
          <div class="info-card-icon">
            <Info :size="20" />
          </div>
          <div class="info-card-text">
            {{ t('groups.verify.closeTab') }}
          </div>
        </div>
      </template>
      <template v-else>
        <div class="verify-icon error-icon">
          <XCircle :size="64" />
        </div>
        <h1 class="verify-title">{{ t('groups.verify.error') }}</h1>
        <p class="verify-description">
          {{ t('groups.verify.errorDescription') }}
        </p>

        <div class="error-card">
          <div class="error-card-header">
            <AlertTriangle :size="20" />
            <span>{{ t('groups.verify.possibleCauses') }}</span>
          </div>
          <ul class="error-reasons">
            <li>{{ t('groups.verify.causes.usedLink') }}</li>
            <li>{{ t('groups.verify.causes.expiredLink') }}</li>
            <li>{{ t('groups.verify.causes.copiedLink') }}</li>
          </ul>
        </div>

        <div class="action-section">
          <router-link to="/" class="btn ghost white-text">
            <ArrowLeft :size="18" />
            {{ t('global.buttons.back') }}
          </router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.verify-container {
  max-width: 600px;
  width: 100%;
}

.verify-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;
}

.verify-icon {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-icon {
  width: 64px;
  height: 64px;
}

.spinner {
  width: 64px;
  height: 64px;
  border: 4px solid var(--border-surface);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.success-icon {
  color: var(--success);
}

.error-icon {
  color: var(--danger);
}

.verify-title {
  font-family: var(--display-font), sans-serif;
  font-size: 32px;
  font-weight: 600;
  color: var(--text-default);
  margin: 0 0 16px 0;
  line-height: 1.2;
}

.verify-description {
  font-size: 16px;
  color: var(--sub);
  margin: 0 0 32px 0;
  max-width: 480px;
  line-height: 1.5;
}

.info-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(106, 237, 139, 0.1);
  border: 1px solid rgba(106, 237, 139, 0.3);
  border-radius: var(--border-radius-md);
  width: 100%;
  max-width: 480px;
  text-align: left;
}

.info-card-icon {
  flex-shrink: 0;
  color: var(--success);
  margin-top: 2px;
}

.info-card-text {
  font-size: 14px;
  color: var(--text-default);
  line-height: 1.5;
}

.error-card {
  padding: 20px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--border-radius-md);
  width: 100%;
  max-width: 480px;
  text-align: left;
  margin-bottom: 24px;
}

.error-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--danger);
  margin-bottom: 12px;
  font-size: 15px;
}

.error-reasons {
  margin: 0;
  padding-left: 24px;
  color: var(--sub);
  font-size: 14px;
  line-height: 1.8;
}

.error-reasons li {
  margin-bottom: 4px;
}

.error-reasons li:last-child {
  margin-bottom: 0;
}

.action-section {
  margin-top: 8px;
}
.white-text {
  color: var(--text-default);
}

@media (max-width: 768px) {
  .verify-content {
    padding: 20px 10px;
  }

  .verify-title {
    font-size: 26px;
  }

  .verify-description {
    font-size: 15px;
    margin-bottom: 24px;
  }

  .info-card,
  .error-card {
    max-width: 100%;
  }
}

@media (max-width: 500px) {
  .verify-icon {
    margin-bottom: 20px;
  }

  .loading-icon,
  .spinner {
    width: 52px;
    height: 52px;
  }

  .success-icon svg,
  .error-icon svg {
    width: 52px;
    height: 52px;
  }

  .verify-title {
    font-size: 24px;
  }

  .verify-description {
    font-size: 14px;
  }

  .info-card,
  .error-card {
    padding: 14px;
  }

  .error-card {
    padding: 16px;
  }
}
</style>