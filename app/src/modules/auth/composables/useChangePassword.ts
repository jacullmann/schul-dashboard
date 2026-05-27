import { ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api.ts';
import type { ChangePasswordErrors } from '@/modules/auth/types';
import { useToast } from '@/common/composables/useToast';

export function useChangePassword(emit: {
  (e: 'cancel'): void;
  (e: 'success'): void;
}) {
  const { t } = useI18n();

  const currentPassword = ref('');
  const newPassword = ref('');
  const newPassword2 = ref('');

  const submitting = ref(false);
  const message = ref('');
  const isError = ref(false);

  const errors = reactive<ChangePasswordErrors>({});

  function clearAllErrors() {
    errors.current = undefined;
    errors.new = undefined;
    errors.confirm = undefined;
  }

  function clearFieldError(field: 'current' | 'new' | 'confirm') {
    errors[field] = undefined;
    message.value = '';
    isError.value = false;
  }

  function setMessage(txt: string, error = false) {
    message.value = txt;
    isError.value = error;
  }

  function validateBeforeSubmit(): boolean {
    clearAllErrors();
    let ok = true;

    if (!currentPassword.value) {
      errors.current = t('auth.change_password.errors.current_missing');
      ok = false;
    } else if (currentPassword.value.length < 8) {
      errors.current = t('auth.change_password.errors.current_short');
      ok = false;
    }

    if (!newPassword.value) {
      errors.new = t('auth.change_password.errors.new_missing');
      ok = false;
    } else if (newPassword.value.length < 8) {
      errors.new = t('auth.change_password.errors.new_short');
      ok = false;
    }

    if (!newPassword2.value) {
      errors.confirm = t('auth.change_password.errors.confirm_missing');
      ok = false;
    } else if (newPassword.value !== newPassword2.value) {
      errors.confirm = t('auth.change_password.errors.confirm_wrong');
      ok = false;
    }

    if (ok && currentPassword.value === newPassword.value) {
      errors.new = t('auth.change_password.errors.equal');
      ok = false;
    }

    return ok;
  }

  async function submit() {
    setMessage('');
    if (!validateBeforeSubmit()) {
      return;
    }

    submitting.value = true;
    try {
      await hw.post('/auth/change-password', {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      });

      useToast().success(t('auth.change_password.success'));
      emit('success');
      emit('cancel');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      const errorMsg =
        err.response?.data?.error ||
        t('auth.change_password.errors.failed');
      setMessage(errorMsg, true);

      if (errorMsg.includes('falsch')) {
        errors.current = t('auth.change_password.errors.current_wrong');
      }
    } finally {
      submitting.value = false;
    }
  }

  return {
    currentPassword,
    newPassword,
    newPassword2,
    submitting,
    message,
    isError,
    errors,
    clearFieldError,
    submit,
  };
}
