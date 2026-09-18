import { ref, computed } from 'vue';
import hw from '@/api/api.ts';
import i18n from '@/i18n';
import type { MfaSetupResponse, MfaStatusResponse } from '@/modules/auth/types';
import { apiErrorMessage } from '@/api/errors';

interface MfaResult {
  ok: boolean;
  error?: string;
}

const mfaEnabled = ref(false);
const mfaLoading = ref(false);
const mfaError = ref<string | null>(null);

export function useMfa() {
  async function fetchMfaStatus(): Promise<boolean> {
    mfaLoading.value = true;
    mfaError.value = null;

    try {
      const { data } = await hw.get<MfaStatusResponse>('/mfa/status');
      mfaEnabled.value = data.mfaEnabled;
      return data.mfaEnabled;
    } catch (err: unknown) {
      mfaError.value = apiErrorMessage(
        err,
        i18n.global.t('auth.mfa.errors.status_failed'),
      );
      return false;
    } finally {
      mfaLoading.value = false;
    }
  }

  async function startMfaSetup(): Promise<MfaSetupResponse | null> {
    mfaLoading.value = true;
    mfaError.value = null;

    try {
      const { data } = await hw.post<MfaSetupResponse>('/mfa/setup');
      return data;
    } catch (err: unknown) {
      mfaError.value = apiErrorMessage(
        err,
        i18n.global.t('auth.mfa.errors.setup_failed'),
      );
      return null;
    } finally {
      mfaLoading.value = false;
    }
  }

  /// The three code-submitting endpoints differ only in URL and side effect.
  async function submitMfaCode(
    url: string,
    code: string,
    onSuccess?: () => void,
  ): Promise<MfaResult> {
    mfaLoading.value = true;
    mfaError.value = null;

    try {
      await hw.post(url, { code });
      onSuccess?.();
      return { ok: true };
    } catch (err: unknown) {
      const errorMsg = apiErrorMessage(
        err,
        i18n.global.t('auth.mfa.verify.errors.failed'),
      );
      mfaError.value = errorMsg;
      return { ok: false, error: errorMsg };
    } finally {
      mfaLoading.value = false;
    }
  }

  const activateMfa = (code: string): Promise<MfaResult> =>
    submitMfaCode('/mfa/activate', code, () => {
      mfaEnabled.value = true;
    });

  const deactivateMfa = (code: string): Promise<MfaResult> =>
    submitMfaCode('/mfa/deactivate', code, () => {
      mfaEnabled.value = false;
    });

  const verifyMfaLogin = (code: string): Promise<MfaResult> =>
    submitMfaCode('/auth/mfa/verify', code);

  async function cancelMfaLogin(): Promise<void> {
    try {
      await hw.post('/auth/mfa/cancel');
    } catch {
      // Best-effort cleanup; the pending token expires on its own.
    }
  }

  function resetMfaState(): void {
    mfaEnabled.value = false;
    mfaError.value = null;
  }

  return {
    mfaEnabled: computed(() => mfaEnabled.value),
    mfaLoading: computed(() => mfaLoading.value),
    mfaError: computed(() => mfaError.value),
    fetchMfaStatus,
    startMfaSetup,
    activateMfa,
    deactivateMfa,
    verifyMfaLogin,
    cancelMfaLogin,
    resetMfaState,
    setMfaEnabled: (value: boolean) => {
      mfaEnabled.value = value;
    },
  };
}
