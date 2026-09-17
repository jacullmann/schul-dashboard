import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api.ts';
import { useMfa } from '@/modules/auth/composables/useMfa';
import { apiErrorMessage } from '@/api/errors';

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

  const email = ref('');
  const password = ref('');
  const submitting = ref(false);
  const message = ref('');
  const isError = ref(false);

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
    message.value = '';
    isError.value = false;
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
    message.value = '';
    isError.value = false;

    if (!validateBeforeSubmit()) {
      return;
    }

    submitting.value = true;
    try {
      const { data } = await hw.post('/auth/login', {
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
      message.value = apiErrorMessage(e, t('common.errors.unknown'));
      isError.value = true;
    } finally {
      submitting.value = false;
    }
  }

  return {
    email,
    password,
    submitting,
    message,
    isError,
    emailInputRef,
    errors,

    clearFieldError,
    submit,
  };
}
