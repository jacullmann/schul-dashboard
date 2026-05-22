import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/hwApi';
import { useMfa } from '@/modules/auth/composables/useMfa';
import type BaseInput from '@/common/components/BaseInput.vue';

export function useLogin(onLoggedIn: () => void, onMfaRequired: () => void) {
  const { t } = useI18n();
  const { resetMfaState } = useMfa();

  const email = ref('');
  const password = ref('');
  const submitting = ref(false);
  const message = ref('');
  const isError = ref(false);

  const emailInputRef = ref<InstanceType<typeof BaseInput> | null>(null);

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
      errors.email = t('account.auth.errors.emailMissing');
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      errors.email = t('account.auth.errors.emailWrong');
      ok = false;
    }

    if (!password.value) {
      errors.password = t('account.auth.errors.passwordMissing');
      ok = false;
    } else if (password.value.length < 8) {
      errors.password = t('account.auth.errors.passwordShort');
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
      const { data } = await hw.post('/api/auth/login', {
        email: email.value,
        password: password.value,
      });

      if (data.ok) {
        if (data.requiresMfa) {
          resetMfaState();
          onMfaRequired();
        } else {
          onLoggedIn();
        }
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.value = err.response?.data?.error || t('global.errors.unknown');
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
