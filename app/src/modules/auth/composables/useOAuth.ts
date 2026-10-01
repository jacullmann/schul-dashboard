import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import hw from '@/api/api.ts';
import { apiErrorMessage } from '@/api/errors';
import { useToast } from '@/common/composables/useToast';

const showLinkModal = ref(false);
const showMfaModal = ref(false);

interface LinkedProvider {
  provider: string;
  email: string;
}

export function useOAuth() {
  const { t } = useI18n();
  const router = useRouter();

  const ERROR_MESSAGES: Record<string, string> & { server_error: string } = {
    access_denied: t('auth.google_link.errors.access_denied'),
    invalid_state: t('auth.google_link.errors.invalid_state'),
    token_invalid: t('auth.google_link.errors.token_invalid'),
    token_exchange_failed: t('auth.google_link.errors.token_exchange_failed'),
    invalid_request: t('auth.google_link.errors.invalid_request'),
    server_error: t('auth.google_link.errors.server_error'),
  };

  function initiateGoogleLogin(): void {
    const base =
      typeof import.meta !== 'undefined' && import.meta.env
        ? (import.meta.env.VITE_API_URL ?? '')
        : '';
    window.location.href = `${base}/auth/google`;
  }

  // Stripped through the router: a raw history.replaceState would be undone
  // when the pending initial navigation commits its own URL.
  async function stripOAuthParams(): Promise<void> {
    await router.isReady();
    const query = { ...router.currentRoute.value.query };
    if (!('auth' in query)) return;
    delete query.auth;
    delete query.reason;
    await router.replace({ query });
  }

  // The backend redirect is a full page load, so App calls this exactly once
  // with the landing URL, before the router has resolved or redirected it.
  function handleOAuthReturn(onSuccess: () => void | Promise<void>): void {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (!auth) return;

    void stripOAuthParams();

    switch (auth) {
      case 'success':
        void onSuccess();
        break;

      case 'link-required':
        showLinkModal.value = true;
        break;

      case 'mfa-pending':
        showMfaModal.value = true;
        break;

      case 'error': {
        const reason = params.get('reason') ?? 'server_error';
        useToast().error(ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.server_error);
        break;
      }
    }
  }
  async function linkGoogleAccount(
    password: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const { data } = await hw.post('/auth/google/link', { password });
      if (data.ok) {
        showLinkModal.value = false;
        return { ok: true };
      }
      return { ok: false, error: t('auth.google_link.errors.failed') };
    } catch (err: unknown) {
      return {
        ok: false,
        error: apiErrorMessage(err, t('auth.google_link.errors.failed')),
      };
    }
  }

  async function unlinkGoogleAccount(): Promise<
    { ok: true } | { ok: false; error: string }
  > {
    try {
      await hw.delete('/auth/google/unlink');
      return { ok: true };
    } catch (err: unknown) {
      return {
        ok: false,
        error: apiErrorMessage(
          err,
          t('auth.connected_accounts.errors.unlink_failed'),
        ),
      };
    }
  }

  async function fetchLinkedProviders(): Promise<LinkedProvider[]> {
    try {
      const { data } = await hw.get<{ providers: LinkedProvider[] }>(
        '/auth/providers',
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

  return {
    showLinkModal,
    showMfaModal,
    initiateGoogleLogin,
    handleOAuthReturn,
    linkGoogleAccount,
    unlinkGoogleAccount,
    fetchLinkedProviders,
    closeLinkModal,
    closeMfaModal,
  };
}
