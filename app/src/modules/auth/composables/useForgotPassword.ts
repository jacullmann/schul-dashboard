import { computed, reactive, ref } from 'vue';
import { useNow } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import api from '@/api/api';
import { apiErrorMessage, isRateLimited } from '@/api/errors';
import type { ForgotPasswordErrors } from '@/modules/auth/types';

const CODE_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Every request replaces the previous code and sends another email, so a
// client-side pause keeps impatient users from invalidating codes in flight.
const RESEND_COOLDOWN_MS = 60_000;

export type ForgotPasswordStep = 'email' | 'code' | 'password';

interface VerifyResetCodeResponse {
  resetToken: string;
}

export function useForgotPassword(
  initialEmail: string,
  onReset: (email: string) => Promise<void>,
) {
  const { t } = useI18n();
  const now = useNow({ interval: 1000 });

  const step = ref<ForgotPasswordStep>('email');
  const email = ref(initialEmail);
  const code = ref('');
  const password = ref('');
  const password2 = ref('');
  const submitting = ref(false);
  const error = ref('');
  const errors = reactive<ForgotPasswordErrors>({});
  const cooldown = ref<{ email: string; until: number } | null>(null);
  let resetToken = '';

  const normalizedEmail = computed(() => email.value.trim().toLowerCase());

  const cooldownSeconds = computed(() => {
    if (cooldown.value?.email !== normalizedEmail.value) return 0;
    // `now` ticks once per second, so it can trail the request by up to a tick.
    const remainingMs = Math.min(
      RESEND_COOLDOWN_MS,
      cooldown.value.until - now.value.getTime(),
    );
    return Math.max(0, Math.ceil(remainingMs / 1000));
  });

  function clearErrors() {
    error.value = '';
    Object.assign(errors, {
      email: undefined,
      code: undefined,
      password: undefined,
      confirm: undefined,
    });
  }

  function clearFieldError(field: keyof ForgotPasswordErrors) {
    errors[field] = undefined;
    error.value = '';
  }

  async function guarded(action: () => Promise<void>) {
    if (submitting.value) return;
    clearErrors();
    submitting.value = true;
    try {
      await action();
    } finally {
      submitting.value = false;
    }
  }

  async function requestCode() {
    if (!EMAIL_PATTERN.test(normalizedEmail.value)) {
      errors.email = t('auth.login.reset.errors.invalid_email');
      return;
    }
    if (cooldownSeconds.value > 0) return;
    try {
      await api.post('/auth/forgot', { email: normalizedEmail.value });
      cooldown.value = {
        email: normalizedEmail.value,
        until: Date.now() + RESEND_COOLDOWN_MS,
      };
      code.value = '';
      step.value = 'code';
    } catch (e: unknown) {
      error.value = isRateLimited(e)
        ? t('common.errors.rate_limited')
        : apiErrorMessage(e, t('auth.login.reset.errors.request_failed'));
    }
  }

  async function verifyCode() {
    const trimmedCode = code.value.trim();
    if (trimmedCode.length !== CODE_LENGTH) {
      errors.code = t('auth.login.reset.errors.invalid_code');
      return;
    }
    try {
      const { data } = await api.post<VerifyResetCodeResponse>(
        '/auth/reset/verify',
        { email: normalizedEmail.value, code: trimmedCode },
      );
      resetToken = data.resetToken;
      step.value = 'password';
    } catch (e: unknown) {
      error.value = apiErrorMessage(
        e,
        t('auth.login.reset.errors.code_expired'),
      );
    }
  }

  function validatePassword(): boolean {
    errors.password =
      password.value.length < MIN_PASSWORD_LENGTH
        ? t('auth.login.reset.errors.password_short')
        : undefined;
    errors.confirm =
      password.value !== password2.value
        ? t('auth.login.reset.errors.password_mismatch')
        : undefined;
    return !errors.password && !errors.confirm;
  }

  async function resetPassword() {
    if (!validatePassword()) return;
    if (!resetToken) {
      step.value = 'email';
      error.value = t('auth.login.reset.errors.no_token');
      return;
    }
    try {
      await api.post('/auth/reset', { resetToken, password: password.value });
    } catch (e: unknown) {
      error.value = apiErrorMessage(
        e,
        t('auth.login.reset.errors.reset_failed'),
      );
      return;
    }
    await onReset(normalizedEmail.value);
  }

  const stepActions: Record<ForgotPasswordStep, () => Promise<void>> = {
    email: requestCode,
    code: verifyCode,
    password: resetPassword,
  };

  function submit() {
    return guarded(stepActions[step.value]);
  }

  function resendCode() {
    return guarded(requestCode);
  }

  function backToEmail() {
    step.value = 'email';
    code.value = '';
    clearErrors();
  }

  return {
    step,
    email,
    code,
    password,
    password2,
    submitting,
    error,
    errors,
    cooldownSeconds,
    clearFieldError,
    submit,
    resendCode,
    backToEmail,
  };
}
