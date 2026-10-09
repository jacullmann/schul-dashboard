import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/api.ts';
import { apiErrorCode, apiErrorStatus, isRateLimited } from '@/api/errors';
import {
  AuthErrorCode,
  authErrorMessage,
} from '@/modules/auth/utils/authErrors';

const BAD_REQUEST = 400;

/**
 * Confirms a sign-up from its emailed link. The account only comes into
 * being once the password chosen at sign-up is entered as well, so a link
 * alone, or a password alone, cannot claim it.
 */
export function useConfirmSignUp(
  token: string,
  onSignedIn: () => void | Promise<void>,
) {
  const { t } = useI18n();

  const password = ref('');
  const passwordError = ref('');
  const formError = ref('');
  const submitting = ref(false);
  /** The link cannot confirm anything: used up, expired or cut short. */
  const linkInvalid = ref(token === '');

  function clearErrors() {
    passwordError.value = '';
    formError.value = '';
  }

  async function submit() {
    clearErrors();
    if (!password.value) {
      passwordError.value = t('auth.login.errors.password_missing');
      return;
    }

    submitting.value = true;
    try {
      await api.post('/auth/verify', { token, password: password.value });
      await onSignedIn();
    } catch (e: unknown) {
      const code = apiErrorCode(e);
      if (code === AuthErrorCode.IncorrectPassword) {
        passwordError.value = t('auth.verify_email.errors.incorrect_password');
      } else if (isRateLimited(e)) {
        formError.value = t('common.errors.rate_limited');
      } else if (!code && apiErrorStatus(e) === BAD_REQUEST) {
        linkInvalid.value = true;
      } else {
        formError.value = authErrorMessage(e, t('common.errors.unknown'));
      }
    } finally {
      submitting.value = false;
    }
  }

  return {
    password,
    passwordError,
    formError,
    submitting,
    linkInvalid,
    clearErrors,
    submit,
  };
}
