import { ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/api.ts';
import type { SetPasswordErrors } from '@/modules/auth/types';
import { useUserStore } from '@/stores/userStore';
import { apiErrorMessage } from '@/api/errors';

const CODE_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;

type SetPasswordStep = 'request' | 'confirm';

/**
 * A Google-only account sets its first password by proving control of its
 * email with a code, without the side effects of a password reset.
 */
export function useSetPassword(onSuccess: () => void) {
  const { t } = useI18n();
  const userStore = useUserStore();

  const step = ref<SetPasswordStep>('request');
  const code = ref('');
  const newPassword = ref('');
  const newPassword2 = ref('');
  const submitting = ref(false);
  const error = ref('');
  const errors = reactive<SetPasswordErrors>({});

  function reset() {
    step.value = 'request';
    code.value = '';
    newPassword.value = '';
    newPassword2.value = '';
    error.value = '';
    Object.assign(errors, {
      code: undefined,
      new: undefined,
      confirm: undefined,
    });
  }

  function clearFieldError(field: keyof SetPasswordErrors) {
    errors[field] = undefined;
    error.value = '';
  }

  function validate(): boolean {
    errors.code =
      code.value.trim().length === CODE_LENGTH
        ? undefined
        : t('auth.login.reset.errors.invalid_code');

    if (!newPassword.value) {
      errors.new = t('auth.change_password.errors.new_missing');
    } else if (newPassword.value.length < MIN_PASSWORD_LENGTH) {
      errors.new = t('auth.login.reset.errors.password_short');
    } else {
      errors.new = undefined;
    }

    if (!newPassword2.value) {
      errors.confirm = t('auth.change_password.errors.confirm_missing');
    } else if (newPassword.value !== newPassword2.value) {
      errors.confirm = t('auth.change_password.errors.confirm_wrong');
    } else {
      errors.confirm = undefined;
    }

    return !errors.code && !errors.new && !errors.confirm;
  }

  async function requestCode() {
    try {
      await api.post('/auth/set-password/code');
      step.value = 'confirm';
    } catch (e: unknown) {
      error.value = apiErrorMessage(
        e,
        t('auth.set_password.errors.request_failed'),
      );
    }
  }

  async function setPassword() {
    if (!validate()) return;

    try {
      await api.post('/auth/set-password', {
        code: code.value.trim(),
        newPassword: newPassword.value,
      });
      userStore.updateUser({ hasPassword: true });
      onSuccess();
    } catch (e: unknown) {
      error.value = apiErrorMessage(e, t('auth.set_password.errors.failed'));
    }
  }

  async function submit() {
    if (submitting.value) return;
    error.value = '';
    submitting.value = true;
    try {
      await (step.value === 'request' ? requestCode() : setPassword());
    } finally {
      submitting.value = false;
    }
  }

  return {
    step,
    code,
    newPassword,
    newPassword2,
    submitting,
    error,
    errors,
    clearFieldError,
    submit,
    reset,
  };
}
