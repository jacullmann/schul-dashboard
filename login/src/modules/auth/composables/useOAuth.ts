import { ref } from 'vue';
import hw from '@/api/hwApi';

const showLinkModal = ref(false);
const showMfaModal = ref(false);
const oauthError = ref<string | null>(null);

interface LinkedProvider {
  provider: string;
  email: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Google-Anmeldung abgebrochen.',
  invalid_state: 'Sicherheitsfehler. Bitte erneut versuchen.',
  token_invalid: 'Google-Token ungültig. Bitte erneut versuchen.',
  token_exchange_failed: 'Verbindung zu Google fehlgeschlagen.',
  invalid_request: 'Ungültige Anfrage. Bitte erneut versuchen.',
  server_error: 'Ein Serverfehler ist aufgetreten.',
};

export function useOAuth() {
  function initiateGoogleLogin(): void {
    const base =
      typeof import.meta !== 'undefined' && import.meta.env
        ? (import.meta.env.VITE_HW_API_BASE ?? '')
        : '';
    window.location.href = `${base}/api/auth/google`;
  }

  function handleOAuthReturn(onSuccess: () => void): void {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (!auth) return;

    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    switch (auth) {
      case 'success':
        onSuccess();
        break;

      case 'link-required':
        showLinkModal.value = true;
        break;

      case 'mfa-pending':
        showMfaModal.value = true;
        break;

      case 'error': {
        const reason = params.get('reason') ?? 'server_error';
        oauthError.value =
          ERROR_MESSAGES[reason] ?? (ERROR_MESSAGES['server_error'] as string);
        break;
      }
    }
  }

  async function linkGoogleAccount(
    password: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const { data } = await hw.post('/api/auth/google/link', { password });
      if (data.ok) {
        showLinkModal.value = false;
        return { ok: true };
      }
      return { ok: false, error: 'Verknüpfung fehlgeschlagen.' };
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      return {
        ok: false,
        error: e.response?.data?.error ?? 'Verknüpfung fehlgeschlagen.',
      };
    }
  }

  async function unlinkGoogleAccount(): Promise<
    { ok: true } | { ok: false; error: string }
  > {
    try {
      await hw.delete('/api/auth/google/unlink');
      return { ok: true };
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      return {
        ok: false,
        error: e.response?.data?.error ?? 'Trennen fehlgeschlagen.',
      };
    }
  }

  async function fetchLinkedProviders(): Promise<LinkedProvider[]> {
    try {
      const { data } = await hw.get<{ providers: LinkedProvider[] }>(
        '/api/auth/providers',
      );
      return data.providers ?? [];
    } catch {
      return [];
    }
  }

  function closeLinkModal(): void {
    showLinkModal.value = false;
  }

  function closeMfaModal(): void {
    showMfaModal.value = false;
  }

  function clearOAuthError(): void {
    oauthError.value = null;
  }

  return {
    showLinkModal,
    showMfaModal,
    oauthError,
    initiateGoogleLogin,
    handleOAuthReturn,
    linkGoogleAccount,
    unlinkGoogleAccount,
    fetchLinkedProviders,
    closeLinkModal,
    closeMfaModal,
    clearOAuthError,
  };
}
