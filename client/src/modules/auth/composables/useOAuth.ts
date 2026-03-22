import { ref } from 'vue';
import hw, { setCsrfToken, syncCsrfFromCookie } from '@/api/hwApi';

// ─── Shared reactive state (module singleton) ─────────────────────────────────

const showLinkModal = ref(false);
const showMfaModal = ref(false);
const oauthError = ref<string | null>(null);

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedProvider {
  provider: string;
  email: string;
}

// ─── Error message map ────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Google-Anmeldung abgebrochen.',
  invalid_state: 'Sicherheitsfehler. Bitte erneut versuchen.',
  token_invalid: 'Google-Token ungültig. Bitte erneut versuchen.',
  token_exchange_failed: 'Verbindung zu Google fehlgeschlagen.',
  invalid_request: 'Ungültige Anfrage. Bitte erneut versuchen.',
  server_error: 'Ein Serverfehler ist aufgetreten.',
};

// ─── Composable ───────────────────────────────────────────────────────────────

export function useOAuth() {
  /**
   * Starts the Google OAuth flow by navigating the browser to the backend
   * initiation endpoint. This is a full page navigation — no popup.
   */
  function initiateGoogleLogin(): void {
    const base =
      typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env.VITE_HW_API_BASE ?? ''
        : '';
    window.location.href = `${base}/api/auth/google`;
  }

  /**
   * Called on app mount to detect and handle the OAuth redirect return.
   * Reads the `?auth=` query parameter and drives the appropriate modal/state.
   *
   * @param onSuccess - Called after a successful OAuth login (same as a normal login callback).
   */
  function handleOAuthReturn(onSuccess: () => void): void {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (!auth) return;

    // Clean the query params from the URL immediately — the params were read.
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    switch (auth) {
      case 'success':
        // The auth_token cookie is already set. Trigger the same post-login
        // hydration the normal login flow uses.
        syncCsrfFromCookie();
        onSuccess();
        break;

      case 'link-required':
        // User has an existing email/password account. Show the linking modal.
        showLinkModal.value = true;
        break;

      case 'mfa-pending':
        // User has MFA enabled. Show the MFA verification overlay.
        showMfaModal.value = true;
        break;

      case 'error': {
        const reason = params.get('reason') ?? 'server_error';
        oauthError.value = ERROR_MESSAGES[reason] ?? ERROR_MESSAGES['server_error'];
        break;
      }
    }
  }

  /**
   * Sends the user's password to the backend to complete the account-linking
   * flow. On success, a full session is established.
   */
  async function linkGoogleAccount(
    password: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const { data } = await hw.post('/api/auth/google/link', { password });
      if (data.ok) {
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        } else {
          syncCsrfFromCookie();
        }
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

  /**
   * Unlinks the Google OAuth provider from the current account.
   */
  async function unlinkGoogleAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
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

  /**
   * Fetches the list of OAuth providers linked to the current account.
   */
  async function fetchLinkedProviders(): Promise<LinkedProvider[]> {
    try {
      const { data } = await hw.get<{ providers: LinkedProvider[] }>('/api/auth/providers');
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
