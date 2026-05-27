import { ref, computed } from 'vue';
import hw from '@/api/api.ts';
import type { MfaSetupResponse, MfaStatusResponse } from '@/modules/auth/types';

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
      const e = err as { response?: { data?: { error?: string } } };
      mfaError.value =
        e.response?.data?.error || 'Fehler beim Abrufen des MFA-Status';
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
      const e = err as { response?: { data?: { error?: string } } };
      mfaError.value =
        e.response?.data?.error || 'Fehler beim Starten des MFA-Setups';
      return null;
    } finally {
      mfaLoading.value = false;
    }
  }

  async function activateMfa(
    code: string,
  ): Promise<{ ok: boolean; error?: string }> {
    mfaLoading.value = true;
    mfaError.value = null;

    try {
      await hw.post('/mfa/activate', { code });
      mfaEnabled.value = true;
      return { ok: true };
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const errorMsg =
        e.response?.data?.error || 'Authentifizierung fehlgeschlagen';
      mfaError.value = errorMsg;
      return { ok: false, error: errorMsg };
    } finally {
      mfaLoading.value = false;
    }
  }

  async function deactivateMfa(
    code: string,
  ): Promise<{ ok: boolean; error?: string }> {
    mfaLoading.value = true;
    mfaError.value = null;

    try {
      await hw.post('/mfa/deactivate', { code });
      mfaEnabled.value = false;
      return { ok: true };
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const errorMsg =
        e.response?.data?.error || 'Authentifizierung fehlgeschlagen';
      mfaError.value = errorMsg;
      return { ok: false, error: errorMsg };
    } finally {
      mfaLoading.value = false;
    }
  }

  async function verifyMfaLogin(
    code: string,
  ): Promise<{ ok: boolean; error?: string }> {
    mfaLoading.value = true;
    mfaError.value = null;

    try {
      await hw.post('/auth/mfa/verify', { code });
      return { ok: true };
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const errorMsg =
        e.response?.data?.error || 'Authentifizierung fehlgeschlagen';
      mfaError.value = errorMsg;
      return { ok: false, error: errorMsg };
    } finally {
      mfaLoading.value = false;
    }
  }

  async function cancelMfaLogin(): Promise<void> {
    try {
      await hw.post('/auth/mfa/cancel');
    } catch {}
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
