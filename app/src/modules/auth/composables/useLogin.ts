import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/api.ts';
import { useMfa } from '@/modules/auth/composables/useMfa';
import { useToast } from '@/common/composables/useToast';
import { apiErrorCode, isRateLimited } from '@/api/errors';
import {
  AuthErrorCode,
  authErrorMessage,
} from '@/modules/auth/utils/authErrors';

/** Where resending the confirmation email of an unconfirmed account stands. */
export type VerificationResend = 'unneeded' | 'available' | 'sending' | 'sent';

/** Subset of `BaseInput`'s exposed API that these forms rely on. */
interface FocusableInput {
  focus: () => void;
}

export function useLogin(
  onLoggedIn: () => void | Promise<void>,
  onMfaRequired: () => void | Promise<void>,
) {
  const { t } = useI18n();
  const { resetMfaState } = useMfa();
  const toast = useToast();

  const email = ref('');
  const password = ref('');
  const submitting = ref(false);
  const formError = ref('');
  const verificationResend = ref<VerificationResend>('unneeded');

  const emailInputRef = ref<FocusableInput | null>(null);

  const errors = reactive<{
    email?: string;
    password?: string;
  }>({});

  onMounted(() => {
    emailInputRef.value?.focus();
  });

  function clearAllErrors() {
    errors.email = undefined;
    errors.password = undefined;
  }

  function clearFieldError(field: 'email' | 'password') {
    errors[field] = undefined;
    formError.value = '';
  }

  function validateBeforeSubmit(): boolean {
    clearAllErrors();
    let ok = true;

    if (!email.value?.trim()) {
      errors.email = t('auth.login.errors.email_missing');
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      errors.email = t('auth.login.errors.email_wrong');
      ok = false;
    }

    if (!password.value) {
      errors.password = t('auth.login.errors.password_missing');
      ok = false;
    } else if (password.value.length < 8) {
      errors.password = t('auth.login.errors.password_short');
      ok = false;
    }

    return ok;
  }

  async function submit() {
    formError.value = '';
    verificationResend.value = 'unneeded';

    if (!validateBeforeSubmit()) {
      return;
    }

    submitting.value = true;
    try {
      const { data } = await api.post('/auth/login', {
        email: email.value,
        password: password.value,
      });

      if (data.ok) {
        if (data.requiresMfa) {
          resetMfaState();
          void onMfaRequired();
        } else {
          void onLoggedIn();
        }
      }
    } catch (e: unknown) {
      formError.value = authErrorMessage(e, t('common.errors.unknown'));
      if (apiErrorCode(e) === AuthErrorCode.EmailNotVerified) {
        verificationResend.value = 'available';
      }
    } finally {
      submitting.value = false;
    }
  }

  /** The answer is the same whether or not a mail went out. */
  async function resendVerification() {
    if (verificationResend.value !== 'available') return;
    verificationResend.value = 'sending';
    try {
      await api.post('/auth/verify/resend', { email: email.value.trim() });
      verificationResend.value = 'sent';
      formError.value = '';
      toast.success(t('auth.login.verify_email.resent'));
    } catch (e: unknown) {
      verificationResend.value = 'available';
      formError.value = isRateLimited(e)
        ? t('common.errors.rate_limited')
        : t('common.errors.unknown');
    }
  }

  return {
    email,
    password,
    submitting,
    formError,
    emailInputRef,
    errors,
    verificationResend,

    clearFieldError,
    submit,
    resendVerification,
  };
}
