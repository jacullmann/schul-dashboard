import { ref, computed } from 'vue';
import hw from '@/api/api.ts';
import i18n from '@/i18n';
import type { AxiosRequestConfig } from 'axios';
import type {
  MfaChallengeResponse,
  MfaSetupResponse,
  MfaStatusResponse,
} from '@/modules/auth/types';
import { apiErrorCode, apiErrorMessage, apiErrorStatus } from '@/api/errors';

interface MfaResult {
  ok: boolean;
  error?: string;
  challengeExpired?: boolean;
}

const MFA_CHALLENGE_EXPIRED = 'MFA_CHALLENGE_EXPIRED';

// The sign-in challenge is carried by its own cookie, not by a session, so a
// 401 there must not trigger a session refresh or the global logout handling.
const challengeRequestConfig: AxiosRequestConfig = {
  _skipAuthRetry: true,
  _silent: true,
};

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
    {
      onSuccess,
      config,
    }: { onSuccess?: () => void; config?: AxiosRequestConfig } = {},
  ): Promise<MfaResult> {
    mfaLoading.value = true;
    mfaError.value = null;

    try {
      await hw.post(url, { code }, config);
      onSuccess?.();
      return { ok: true };
    } catch (err: unknown) {
      const challengeExpired = apiErrorCode(err) === MFA_CHALLENGE_EXPIRED;
      // The rate limiter answers in plain text, so it carries no `error` field.
      const errorMsg = challengeExpired
        ? i18n.global.t('auth.mfa.verify.errors.challenge_expired')
        : apiErrorStatus(err) === 429
          ? i18n.global.t('auth.mfa.verify.errors.rate_limited')
          : apiErrorMessage(
              err,
              i18n.global.t('auth.mfa.verify.errors.failed'),
            );
      mfaError.value = errorMsg;
      return { ok: false, error: errorMsg, challengeExpired };
    } finally {
      mfaLoading.value = false;
    }
  }

  const activateMfa = (code: string): Promise<MfaResult> =>
    submitMfaCode('/mfa/activate', code, {
      onSuccess: () => {
        mfaEnabled.value = true;
      },
    });

  const deactivateMfa = (code: string): Promise<MfaResult> =>
    submitMfaCode('/mfa/deactivate', code, {
      onSuccess: () => {
        mfaEnabled.value = false;
      },
    });

  const verifyMfaLogin = (code: string): Promise<MfaResult> =>
    submitMfaCode('/auth/mfa/verify', code, {
      config: challengeRequestConfig,
    });

  /** Seconds left on the pending sign-in challenge, or `null` if there is none. */
  async function fetchMfaChallengeExpiresIn(): Promise<number | null> {
    try {
      const { data } = await hw.get<MfaChallengeResponse>(
        '/auth/mfa/challenge',
        challengeRequestConfig,
      );
      return data.expiresIn;
    } catch (err: unknown) {
      if (apiErrorCode(err) === MFA_CHALLENGE_EXPIRED) return null;
      throw err;
    }
  }

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
    fetchMfaChallengeExpiresIn,
    cancelMfaLogin,
    resetMfaState,
    setMfaEnabled: (value: boolean) => {
      mfaEnabled.value = value;
    },
  };
}
